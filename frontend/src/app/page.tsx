'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, BarChart, Upload, Edit, Trash2, Monitor, LogOut } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import ManualInput from '@/components/ManualInput';
import InvestmentList from '@/components/InvestmentList';
import MonthlyView from '@/components/MonthlyView';
import ExchangeMonitor from '@/components/ExchangeMonitor';
import { useInvestmentData } from '@/hooks/useInvestmentData';
import { OCRResult } from '@/types/investment';

type Tab = 'upload' | 'manual' | 'list' | 'monthly' | 'monitor';

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/login');
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  
  const { records, profits, loading, addRecord, addManualRecord, deleteRecord, deleteProfit, clearAllData } = useInvestmentData();

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleOCRResult = async (result: OCRResult) => {
    const response = await addRecord(result, 'photo');
    showMessage(response.message, response.success ? 'success' : 'error');
  };

  const handleOCRError = (error: string) => {
    showMessage(error, 'error');
  };

  const handleManualSubmit = async (data: {
    type: 'USD 사기' | 'USD 팔기';
    foreignAmount: number;
    exchangeRate: number;
  }) => {
    const response = await addManualRecord(data);
    showMessage(response.message, response.success ? 'success' : 'error');
  };

  const handleDeleteRecord = async (recordId: string) => {
    const response = await deleteRecord(recordId);
    showMessage(response.message, response.success ? 'success' : 'error');
  };

  const handleDeleteProfit = async (profitId: string) => {
    const response = await deleteProfit(profitId);
    showMessage(response.message, response.success ? 'success' : 'error');
  };

  const handleClearData = async () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      const response = await clearAllData();
      showMessage(response.message, response.success ? 'success' : 'error');
    }
  };

  const tabs = [
    { id: 'upload' as Tab, label: '사진 업로드', icon: Upload },
    { id: 'manual' as Tab, label: '직접 입력', icon: Edit },
    { id: 'list' as Tab, label: '투자 진행 중', icon: BarChart },
    { id: 'monthly' as Tab, label: '투자 완료', icon: BarChart },
    { id: 'monitor' as Tab, label: '환율 모니터링', icon: Monitor }
  ];

  if (auth.isLoading || !auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">환율 투자 기록 관리</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                총 {records.length}건의 기록
              </div>
              <button
                onClick={handleClearData}
                className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                데이터 초기화
              </button>
              <button
                onClick={auth.logout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메시지 */}
      {message && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4`}>
          <div className={`flex items-center p-4 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <AlertCircle className="w-5 h-5 mr-2" />
            {message}
          </div>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center whitespace-nowrap py-2 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">데이터를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {activeTab === 'upload' && (
                <div className="max-w-2xl mx-auto">
                  <ImageUploader
                    onOCRResult={handleOCRResult}
                    onError={handleOCRError}
                  />
                </div>
              )}

              {activeTab === 'manual' && (
                <div className="max-w-md mx-auto">
                  <ManualInput onSubmit={handleManualSubmit} />
                </div>
              )}

              {activeTab === 'list' && (
                <InvestmentList 
                  records={records} 
                  profits={profits} 
                  onDeleteRecord={handleDeleteRecord}
                />
              )}

              {activeTab === 'monthly' && (
                <MonthlyView 
                  records={records} 
                  profits={profits} 
                  onDeleteProfit={handleDeleteProfit}
                />
              )}
              
              {activeTab === 'monitor' && (
                <div className="max-w-2xl mx-auto">
                  <ExchangeMonitor />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
