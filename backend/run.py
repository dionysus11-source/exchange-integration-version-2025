#!/usr/bin/env python3
"""
환율 모니터링 서버 실행 스크립트
"""

import subprocess
import sys
import os

def check_dependencies():
    """필요한 의존성이 설치되어 있는지 확인합니다."""
    try:
        import flask
        import requests
        import bs4
        import lxml
        import telegram
        print("✓ 모든 의존성이 설치되어 있습니다.")
        return True
    except ImportError as e:
        print(f"✗ 의존성 설치 필요: {e}")
        return False

def install_dependencies():
    """requirements.txt에서 의존성을 설치합니다."""
    print("의존성을 설치하는 중...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ 의존성 설치 완료")
        return True
    except subprocess.CalledProcessError:
        print("✗ 의존성 설치 실패")
        return False

def main():
    print("환율 모니터링 서버를 시작합니다...")
    
    # 의존성 확인
    if not check_dependencies():
        if input("의존성을 자동으로 설치하시겠습니까? (y/N): ").lower() == 'y':
            if not install_dependencies():
                sys.exit(1)
        else:
            print("먼저 'pip install -r requirements.txt'를 실행해주세요.")
            sys.exit(1)
    
    # 서버 실행
    print("서버를 시작하는 중...")
    print("서버 주소: http://localhost:3001")
    print("중지하려면 Ctrl+C를 누르세요.")
    
    try:
        from server import app
        app.run(host='0.0.0.0', port=3001, debug=True)
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
    except Exception as e:
        print(f"서버 실행 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 