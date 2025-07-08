'use client';

import { useState, useEffect, useCallback } from 'react';
import axios, { isAxiosError, AxiosRequestConfig } from 'axios';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Bell, BellOff, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://dionysus11.ddns.net:3001';

export default function ExchangeMonitor() {
    const { token } = useAuth();
    const [monitoring, setMonitoring] = useState(false);
    const [previousMonitoring, setPreviousMonitoring] = useState(false);
    const [settings, setSettings] = useState({
        upperLimit: '',
        lowerLimit: '',
    });
    const [currentRate, setCurrentRate] = useState<number | null>(null);
    const [autoStoppedAlert, setAutoStoppedAlert] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const getAuthConfig = useCallback((): AxiosRequestConfig => {
        if (!token) return {};
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    }, [token]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const [statusRes, rateRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/status`, getAuthConfig()),
                    axios.get(`${API_BASE_URL}/rate`, getAuthConfig())
                ]);

                setMonitoring(statusRes.data.monitoring);
                setPreviousMonitoring(statusRes.data.monitoring);
                if (statusRes.data.settings) {
                    const fetched = statusRes.data.settings;
                    setSettings(prev => ({ 
                        ...prev,
                        upperLimit: fetched.upperLimit || '',
                        lowerLimit: fetched.lowerLimit || '',
                    }));
                }
                setCurrentRate(rateRes.data.rate);

            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [token, getAuthConfig]);

    useEffect(() => {
        if (!token) return;

        const fetchStatus = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/status`, getAuthConfig());
                const isMonitoring = response.data.monitoring;
                
                if (previousMonitoring && !isMonitoring && monitoring) {
                    setAutoStoppedAlert('🚨 모니터링이 설정된 조건에 도달하여 자동으로 중지되었습니다!');
                    setTimeout(() => setAutoStoppedAlert(''), 10000);
                }
                
                setPreviousMonitoring(monitoring);
                setMonitoring(isMonitoring);
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        };

        const fetchRate = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/rate`, getAuthConfig());
                setCurrentRate(response.data.rate);
            } catch (error) {
                console.error('Error fetching exchange rate:', error);
            }
        };

        const statusInterval = setInterval(fetchStatus, 5000);
        const rateInterval = setInterval(fetchRate, 60000);

        return () => {
            clearInterval(statusInterval);
            clearInterval(rateInterval);
        };
    }, [monitoring, previousMonitoring, token, getAuthConfig]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const startMonitoring = async () => {
        try {
            const dataToSend = {
                upperLimit: settings.upperLimit,
                lowerLimit: settings.lowerLimit,
            };
            await axios.post(`${API_BASE_URL}/start`, dataToSend, getAuthConfig());
            setMonitoring(true);
        } catch (error) {
            console.error('Error starting monitoring:', error);
            if (isAxiosError(error)) {
                alert(error.response?.data || 'An error occurred');
            } else {
                alert('An error occurred');
            }
        }
    };

    const stopMonitoring = async () => {
        try {
            await axios.post(`${API_BASE_URL}/stop`, {}, getAuthConfig());
            setMonitoring(false);
            setSettings({ upperLimit: '', lowerLimit: '' });
        } catch (error) {
            console.error('Error stopping monitoring:', error);
            if (isAxiosError(error)) {
                alert(error.response?.data || 'An error occurred');
            } else {
                alert('An error occurred');
            }
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">모니터링 상태를 불러오는 중...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {autoStoppedAlert && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                    <p className="font-bold flex items-center"><AlertTriangle className="mr-2" />알림</p>
                    <p>{autoStoppedAlert}</p>
                </div>
            )}
            
            <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">현재 USD/KRW 환율</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                    {currentRate ? `₩${currentRate.toFixed(2)}` : '로딩 중...'}
                </p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">모니터링 설정</h3>
                <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <div>
                        <label htmlFor="upperLimit" className="block text-sm font-medium text-gray-700">상한선</label>
                        <input type="number" name="upperLimit" id="upperLimit" value={settings.upperLimit} onChange={handleInputChange} disabled={monitoring} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="lowerLimit" className="block text-sm font-medium text-gray-700">하한선</label>
                        <input type="number" name="lowerLimit" id="lowerLimit" value={settings.lowerLimit} onChange={handleInputChange} disabled={monitoring} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                    {!monitoring ? (
                        <button onClick={startMonitoring} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <Bell className="mr-2 h-4 w-4" /> 모니터링 시작
                        </button>
                    ) : (
                        <button onClick={stopMonitoring} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                            <BellOff className="mr-2 h-4 w-4" /> 모니터링 중지
                        </button>
                    )}
                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${monitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {monitoring ? '모니터링 중...' : '모니터링 중지됨'}
                    </span>
                </div>
            </div>
        </div>
    );
} 