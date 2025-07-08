import asyncio
import threading
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from lxml import html
import telegram
import logging
import sqlite3
import os
import uuid
import subprocess
import json
import base64

app = Flask(__name__)
CORS(app)

# Global variables
monitoring = False
monitor_thread = None
settings = {
    'upperLimit': None,
    'lowerLimit': None,
    'telegramToken': None,
    'telegramChatId': None
}

bot = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Database Setup ---
DB_PATH = 'exchange-diary.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    # 투자 기록 테이블
    conn.execute('''
        CREATE TABLE IF NOT EXISTS investments (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('USD 사기', 'USD 팔기')),
          foreignAmount REAL NOT NULL,
          exchangeRate REAL NOT NULL,
          wonAmount REAL NOT NULL,
          source TEXT NOT NULL CHECK (source IN ('photo', 'manual')),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # 수익 기록 테이블
    conn.execute('''
        CREATE TABLE IF NOT EXISTS profits (
          id TEXT PRIMARY KEY,
          buyDate TEXT NOT NULL,
          sellDate TEXT NOT NULL,
          buyRecordId TEXT NOT NULL,
          sellRecordId TEXT NOT NULL,
          foreignAmount REAL NOT NULL,
          buyRate REAL NOT NULL,
          sellRate REAL NOT NULL,
          buyWonAmount REAL NOT NULL,
          sellWonAmount REAL NOT NULL,
          profit REAL NOT NULL,
          profitRate REAL NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully.")

# Initialize database on startup
init_db()
# --- End Database Setup ---


def get_exchange_rate():
    """네이버 증권에서 USD/KRW 환율을 가져옵니다."""
    logger.info('Attempting to fetch exchange rate from Naver Stock...')
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(
            'https://m.stock.naver.com/marketindex/exchange/FX_USDKRW',
            timeout=5,
            headers=headers
        )
        response.raise_for_status()
        logger.info('Successfully received response from Naver Stock.')
        
        # XPath를 사용하여 환율 값 추출
        tree = html.fromstring(response.content)
        rate_elements = tree.xpath('/html/body/div[1]/div[1]/div[2]/div/div[1]/div[2]/div[2]/strong/text()')
        
        if not rate_elements:
            logger.error('Could not find exchange rate element using XPath.')
            return None
            
        rate_text = rate_elements[0].strip().replace(',', '')
        logger.info(f'Found rate text: {rate_text}')
        
        rate = float(rate_text)
        logger.info(f'Parsed rate: {rate}')
        return rate
        
    except Exception as error:
        logger.error(f'Error getting exchange rate: {error}')
        return None

def send_message_sync(message):
    """텔레그램으로 메시지를 보냅니다 (동기 방식)."""
    if bot and settings['telegramChatId']:
        logger.info(f"Attempting to send Telegram message: '{message}'")
        try:
            # python-telegram-bot v20+ is async, so we need an event loop
            # to call the async send_message method from a sync thread.
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Await the coroutine
            loop.run_until_complete(bot.send_message(chat_id=settings['telegramChatId'], text=message))
            loop.close()
            logger.info("Successfully sent Telegram message.")
        except Exception as error:
            logger.error("Failed to send Telegram message.", exc_info=True)

def check_rate():
    """환율을 체크하고 필요시 알림을 보냅니다."""
    global monitoring
    
    rate = get_exchange_rate()
    if rate:
        try:
            # 안전한 타입 변환 및 비교
            upper_limit = float(settings['upperLimit']) if settings['upperLimit'] else None
            lower_limit = float(settings['lowerLimit']) if settings['lowerLimit'] else None
            
            if upper_limit and rate > upper_limit:
                send_message_sync(
                    f"🚨 알림: 환율이 상한선에 도달했습니다!\n"
                    f"현재 환율: {rate}원\n"
                    f"설정한 상한선: {upper_limit}원\n"
                    f"모니터링을 자동으로 중지합니다."
                )
                monitoring = False
                logger.info(f"Monitoring stopped automatically: rate {rate} exceeded upper limit {upper_limit}")
                
            elif lower_limit and rate < lower_limit:
                send_message_sync(
                    f"🚨 알림: 환율이 하한선에 도달했습니다!\n"
                    f"현재 환율: {rate}원\n"
                    f"설정한 하한선: {lower_limit}원\n"
                    f"모니터링을 자동으로 중지합니다."
                )
                monitoring = False
                logger.info(f"Monitoring stopped automatically: rate {rate} fell below lower limit {lower_limit}")
                
        except (ValueError, TypeError) as e:
            logger.error(f'Error in rate comparison: {e}')

def monitor_loop():
    """모니터링 루프를 실행합니다."""
    while monitoring:
        check_rate()
        time.sleep(60)  # 60초마다 체크

@app.route('/start', methods=['POST'])
def start_monitoring():
    global monitoring, monitor_thread, settings, bot
    
    if monitoring:
        return 'Monitoring is already running', 400
    
    settings = request.json
    if not settings.get('telegramToken') or not settings.get('telegramChatId'):
        return 'Telegram token and chat ID are required', 400
    
    # 숫자 값들을 float로 변환
    try:
        if settings.get('upperLimit'):
            settings['upperLimit'] = float(settings['upperLimit'])
        if settings.get('lowerLimit'):
            settings['lowerLimit'] = float(settings['lowerLimit'])
    except (ValueError, TypeError) as e:
        return f'Invalid limit values: {e}', 400
    
    try:
        # python-telegram-bot 20.x 최신 버전 사용
        bot = telegram.Bot(token=settings['telegramToken'])
        monitoring = True
        monitor_thread = threading.Thread(target=monitor_loop)
        monitor_thread.daemon = True
        monitor_thread.start()
        return 'Monitoring started'
    except Exception as e:
        logger.error(f'Error starting monitoring: {e}')
        return f'Error starting monitoring: {e}', 500

@app.route('/stop', methods=['POST'])
def stop_monitoring():
    global monitoring
    
    if not monitoring:
        return 'Monitoring is not running', 400
    
    monitoring = False
    return 'Monitoring stopped'

@app.route('/status', methods=['GET'])
def get_status():
    # Create a copy of settings and remove sensitive information
    display_settings = settings.copy()
    if 'telegramToken' in display_settings:
        display_settings['telegramToken'] = '********'
    if 'telegramChatId' in display_settings:
        display_settings['telegramChatId'] = '********'

    return jsonify({
        'monitoring': monitoring,
        'settings': display_settings
    })

# --- Diary App API Endpoints ---

@app.route('/api/investments', methods=['GET'])
def get_all_investments():
    try:
        conn = get_db_connection()
        investments_cursor = conn.execute('SELECT * FROM investments ORDER BY date DESC')
        investments = [dict(row) for row in investments_cursor.fetchall()]
        
        profits_cursor = conn.execute('SELECT * FROM profits ORDER BY sellDate DESC')
        profits = [dict(row) for row in profits_cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'investments': investments,
            'profits': profits
        })
    except Exception as e:
        logger.error(f"Error getting investments: {e}")
        return jsonify({'error': '서버 오류'}), 500

def get_next_investment_id():
    conn = get_db_connection()
    cursor = conn.execute("SELECT id FROM investments WHERE id LIKE 'INV_%' ORDER BY CAST(SUBSTR(id, 5) AS INTEGER) DESC LIMIT 1")
    last_record = cursor.fetchone()
    conn.close()
    if not last_record:
        return 'INV_0001'
    last_number = int(last_record['id'].replace('INV_', ''))
    next_number = last_number + 1
    return f"INV_{str(next_number).zfill(4)}"

def find_matching_buy_record(sell_record):
    conn = get_db_connection()
    cursor = conn.execute("""
        SELECT * FROM investments 
        WHERE type = 'USD 사기' 
          AND ABS(foreignAmount - ?) < 0.01
          AND date < ?
        ORDER BY date ASC
        LIMIT 1
    """, (sell_record['foreignAmount'], sell_record['date']))
    record = cursor.fetchone()
    conn.close()
    return dict(record) if record else None

@app.route('/api/investments', methods=['POST'])
def add_investment():
    try:
        body = request.json
        records = body.get('records', [])
        source = body.get('source', 'photo')

        if not isinstance(records, list):
            return jsonify({'error': '잘못된 데이터 형식입니다.'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        results = []

        for record_data in records:
            # 중복 체크
            cursor.execute("""
                SELECT COUNT(*) as count FROM investments 
                WHERE date = ? AND type = ? AND foreignAmount = ? AND exchangeRate = ?
            """, (record_data['date'], record_data['type'], record_data['foreignAmount'], record_data['exchangeRate']))
            is_duplicate = cursor.fetchone()['count'] > 0

            if is_duplicate:
                results.append({'success': False, 'error': '중복된 기록입니다.', 'data': record_data})
                continue
            
            new_id = get_next_investment_id()
            new_record = {
                'id': new_id,
                **record_data,
                'source': source,
                'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            }

            cursor.execute("""
                INSERT INTO investments (id, date, type, foreignAmount, exchangeRate, wonAmount, source, createdAt)
                VALUES (:id, :date, :type, :foreignAmount, :exchangeRate, :wonAmount, :source, :createdAt)
            """, new_record)

            if new_record['type'] == 'USD 팔기':
                matching_buy = find_matching_buy_record(new_record)
                if matching_buy:
                    # 수익 계산
                    profit = (new_record['wonAmount'] - matching_buy['wonAmount'])
                    profit_rate = (profit / matching_buy['wonAmount']) * 100

                    profit_id = f"profit_{int(time.time() * 1000)}_{new_id}"
                    
                    # 수익 기록 저장
                    cursor.execute("""
                        INSERT INTO profits (id, buyDate, sellDate, buyRecordId, sellRecordId, foreignAmount, buyRate, sellRate, buyWonAmount, sellWonAmount, profit, profitRate, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (profit_id, matching_buy['date'], new_record['date'], matching_buy['id'], new_record['id'], new_record['foreignAmount'], matching_buy['exchangeRate'], new_record['exchangeRate'], matching_buy['wonAmount'], new_record['wonAmount'], profit, profit_rate, new_record['createdAt']))

                    # 매칭된 기록 삭제
                    cursor.execute("DELETE FROM investments WHERE id = ?", (matching_buy['id'],))
                    cursor.execute("DELETE FROM investments WHERE id = ?", (new_record['id'],))
            
            results.append({'success': True, 'data': new_record})

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'results': results})

    except Exception as e:
        logger.error(f"Error adding investment: {e}")
        conn.rollback()
        conn.close()
        return jsonify({'error': '서버 오류'}), 500

@app.route('/api/investments', methods=['DELETE'])
def delete_data():
    profit_id = request.args.get('profitId')
    try:
        conn = get_db_connection()
        if profit_id:
            # 특정 수익 기록 삭제
            result = conn.execute('DELETE FROM profits WHERE id = ?', (profit_id,))
            conn.commit()
            conn.close()
            if result.rowcount > 0:
                return jsonify({'success': True, 'message': '수익 기록이 삭제되었습니다.'})
            else:
                return jsonify({'success': False, 'error': '해당 수익 기록을 찾을 수 없습니다.'}), 404
        else:
            # 모든 데이터 삭제
            conn.execute('DELETE FROM profits')
            conn.execute('DELETE FROM investments')
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': '모든 데이터가 삭제되었습니다.'})
    except Exception as e:
        logger.error(f"Error deleting data: {e}")
        return jsonify({'error': '데이터 삭제 실패'}), 500

@app.route('/api/investments/<string:investment_id>', methods=['DELETE'])
def delete_investment(investment_id):
    try:
        conn = get_db_connection()
        
        # 삭제할 기록 정보 가져오기 (메시지용)
        record_to_delete = conn.execute('SELECT type FROM investments WHERE id = ?', (investment_id,)).fetchone()
        if not record_to_delete:
            conn.close()
            return jsonify({'success': False, 'message': '삭제할 기록을 찾을 수 없습니다.'}), 404
        
        # 관련 수익 기록 삭제
        deleted_profits = conn.execute('DELETE FROM profits WHERE buyRecordId = ? OR sellRecordId = ?', (investment_id, investment_id))
        
        # 투자 기록 삭제
        deleted_investment = conn.execute('DELETE FROM investments WHERE id = ?', (investment_id,))
        
        conn.commit()
        conn.close()

        if deleted_investment.rowcount == 0:
            return jsonify({'success': False, 'message': '기록을 삭제할 수 없습니다.'}), 400

        message = f"{dict(record_to_delete)['type']} 기록이 삭제되었습니다.{' (관련 수익 기록도 함께 삭제됨)' if deleted_profits.rowcount > 0 else ''}"
        return jsonify({'success': True, 'message': message})

    except Exception as e:
        logger.error(f"Error deleting investment: {e}")
        return jsonify({'error': '기록을 삭제하는 중 오류가 발생했습니다.'}), 500

@app.route('/api/ocr', methods=['POST'])
def ocr_from_image():
    try:
        data = request.json
        image_base64 = data.get('imageBase64')
        if not image_base64:
            return jsonify({'error': 'No image data provided'}), 400

        # Create a temporary file to store the image
        temp_dir = 'temp'
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        filename = os.path.join(temp_dir, f'ocr_{uuid.uuid4()}.png')
        base64_data = image_base64.replace('data:image/png;base64,', '')
        
        with open(filename, 'wb') as f:
            f.write(base64.b64decode(base64_data))

        # Execute the EasyOCR script
        try:
            # Assuming python3 is in the path. For Windows, it might just be 'python'.
            python_executable = 'python' if os.name == 'nt' else 'python3'
            result = subprocess.run(
                [python_executable, 'easyocr_ocr.py', filename],
                capture_output=True,
                text=True,
                check=True,
                encoding='utf-8'
            )
            output = json.loads(result.stdout)
            return jsonify(output)

        except FileNotFoundError:
             logger.error("Python executable not found. Make sure 'python' or 'python3' is in the system's PATH.")
             return jsonify({'error': "Python executable not found."}), 500
        except subprocess.CalledProcessError as e:
            logger.error(f"EasyOCR script failed with exit code {e.returncode}")
            logger.error(f"Stderr: {e.stderr}")
            return jsonify({'error': 'EasyOCR 실행 오류', 'detail': e.stderr}), 500
        finally:
            # Clean up the temporary file
            if os.path.exists(filename):
                os.remove(filename)

    except Exception as e:
        logger.error(f"An error occurred during OCR processing: {e}", exc_info=True)
        return jsonify({'error': '서버 오류', 'detail': str(e)}), 500


# --- End Diary App API Endpoints ---

@app.route('/rate', methods=['GET'])
def get_rate():
    rate = get_exchange_rate()
    if rate:
        return jsonify({'rate': rate})
    else:
        return 'Error fetching exchange rate', 500

if __name__ == '__main__':
    print('Backend server listening at http://localhost:3001')
    app.run(host='0.0.0.0', port=3001, debug=True) 