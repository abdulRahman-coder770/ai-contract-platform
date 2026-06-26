import React, { useState, useRef, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';



window.Pusher = Pusher;
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: false,
    enabledTransports: ['ws'],
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
        }
    }
});

export default function Dashboard({ auth, contracts: initialContracts }) {

const { data, setData, post, processing, errors, reset,progress } = useForm({
title: '',
description: '',
body: '',
contract_file: null,
});
const [isProcessing, setIsProcessing] = useState(false); 
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const [showAnalytics, setShowAnalytics] = useState(true);
    const [uiError, setUiError] = useState('');
    const [activeChatContract, setActiveChatContract] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);
    const messagesEndRef = useRef(null);
  
    const [contractList, setContractList] = React.useState(initialContracts);


useEffect(() => {
    if (!auth.user?.id) return;

    const channel = window.Echo.private(`user.${auth.user.id}`);

    channel.listen('.ContractAnalyzedEvent', (e) => {
        
        console.log('Received Event Payload:', e); 
        setIsProcessing(false)
        setContractList((prevContracts) => {
        // 1. Check if the contract already exists in our list
        const exists = prevContracts.some((c) => c.id == e.id);

        if (exists) {
           
            return prevContracts.map((contract) =>
                contract.id == e.id
                    ? { ...contract, title: e.title,desc:e.desc, status: e.status, analysis: e.analysis }
                    : contract
            );
        } else {
           
            return [{ id: e.id, title: e.title,desc:e.desc, status: e.status, analysis: e.analysis }, ...prevContracts];
        }
        
    });
       

    });

    return () => {
        window.Echo.leave(`user.${auth.user.id}`);
    };
}, [auth.user.id]);


useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
}, [chatMessages, isAILoading]);



const totalContracts = contractList.length;
const analyzedContracts = contractList.filter(c => c.analysis);
const avgRisk = analyzedContracts.length > 0 
    ? Math.round(analyzedContracts.reduce((acc, curr) => acc + (Number(curr.analysis?.risk_score) || 0), 0) / analyzedContracts.length)
    : 0;

const highRiskCount = analyzedContracts.filter(c => (Number(c.analysis?.risk_score) || 0) >= 70).length;
const medRiskCount = analyzedContracts.filter(c => (Number(c.analysis?.risk_score) || 0) >= 40 && (Number(c.analysis?.risk_score) || 0) < 70).length;
const lowRiskCount = analyzedContracts.filter(c => (Number(c.analysis?.risk_score) || 0) < 40).length;


const riskCategories = {
    payment: { label: 'Payment & Fee Risks', count: 0, color: 'bg-emerald-500' },
    ip: { label: 'IP & Ownership Issues', count: 0, color: 'bg-indigo-500' },
    liability: { label: 'Liability & Indemnity Risks', count: 0, color: 'bg-rose-500' },
    termination: { label: 'Termination & Breaches', count: 0, color: 'bg-amber-500' },
};

analyzedContracts.forEach(c => {
    const findings = (c.analysis?.key_findings || []).join(' ').toLowerCase();
    if (findings.includes('payment') || findings.includes('fee') || findings.includes('milestone') || findings.includes('deadline')) riskCategories.payment.count++;
    if (findings.includes('intellectual') || findings.includes('ip') || findings.includes('property') || findings.includes('ownership')) riskCategories.ip.count++;
    if (findings.includes('liability') || findings.includes('indemnity') || findings.includes('dispute') || findings.includes('limit')) riskCategories.liability.count++;
    if (findings.includes('termination') || findings.includes('cancel') || findings.includes('breach') || findings.includes('notice')) riskCategories.termination.count++;
});

const maxCategoryCount = Math.max(...Object.values(riskCategories).map(cat => cat.count), 1);


const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
};

const handleDragLeave = () => {
    setIsDragging(false);
};

const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setUiError('');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        setData('contract_file', file);
        setFileName(file.name);
        setData(prev => ({ ...prev, contract_file: file, body: '' }));
    } else {
        setUiError('Invalid file type. Please upload a standard text-based PDF file.');
    }
};

const handleFileChange = (e) => {
    setUiError('');
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        setData('contract_file', file);
        setFileName(file.name);
        setData(prev => ({ ...prev, contract_file: file, body: '' }));
    } else {
        setUiError('Please upload a valid PDF document.');
    }
};

const handleSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    post(route('contracts.store'), {
        forceFormData: true,
        onSuccess: () => {
            
                      reset();
            setFileName('');
        }, 
        onError: (errors) => {
            setIsProcessing(false); 
            console.error('Submission failed:', errors);
            setUiError('Session expired or unauthorized. Please refresh the page.');
        }
    });
};
const deleteContract = (id) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    axios.delete(`/contracts/${id}`)
        .then(() => {
            
            setContractList((prev) => prev.filter((c) => c.id !== id));
        })
        .catch((err) => {
            console.error('Delete failed', err);
            alert('Could not delete the contract.');
        });
};


const startChatSession = (contract) => {
    setActiveChatContract(contract);
    setChatMessages([
        {
            role: 'system',
            text: `Hi! I have fully loaded "${contract.title}". Ask me any questions regarding its liability clauses, payment conditions, or delivery milestones.`
        }
    ]);
    setCurrentQuestion('');
};

const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isAILoading) return;

    const userText = currentQuestion;
    setCurrentQuestion('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsAILoading(true);

    try {
        const response = await axios.post(`/contracts/${activeChatContract.id}/chat`, {
            message: userText
        });

        if (response.data && response.data.reply) {
            setChatMessages(prev => [...prev, { role: 'ai', text: response.data.reply }]);
           
        }
    } catch (error) {
        const errorMsg = error.response?.data?.error || 'Failed to reach AI engine.';
        setChatMessages(prev => [...prev, { role: 'error', text: errorMsg }]);
    } finally {
        setIsAILoading(false);
    }
};

return (
    <AuthenticatedLayout user={auth.user}>
        <div className="py-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {progress && (
    <progress value={progress.percentage} max="100">
        {progress.percentage}%
    </progress>
)}
                
               
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Audit Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">Review legal documents with high-fidelity local AI models</p>
                    </div>
                    <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className="mt-4 md:mt-0 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5 transition-all"
                    >
                        <svg className={`w-4 h-4 transition-transform duration-200 ${showAnalytics ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
                    </button>
                </div>

              
                {showAnalytics && analyzedContracts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
                        
                       
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex flex-col items-center justify-center text-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Portfolio Risk Index</h3>
                            <div className="relative flex items-center justify-center">
                               
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle cx="64" cy="64" r="50" stroke="#f3f4f6" strokeWidth="10" fill="transparent" />
                                    <circle 
                                        cx="64" 
                                        cy="64" 
                                        r="50" 
                                        stroke={avgRisk > 60 ? '#ef4444' : avgRisk > 30 ? '#f59e0b' : '#10b981'} 
                                        strokeWidth="10" 
                                        fill="transparent" 
                                        strokeDasharray="314" 
                                        strokeDashoffset={314 - (314 * avgRisk) / 100}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute text-center">
                                    <span className="text-3xl font-black text-gray-900 leading-none">{avgRisk}%</span>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase mt-0.5">Average</span>
                                </div>
                            </div>
                            <span className={`mt-4 px-3 py-1 rounded-full text-xxs font-black uppercase tracking-wider ${
                                avgRisk > 60 ? 'bg-red-50 text-red-700' : avgRisk > 30 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                            }`}>
                                {avgRisk > 60 ? 'Unfavorable Balance' : avgRisk > 30 ? 'Caution Advised' : 'Optimal Compliance'}
                            </span>
                        </div>

                        
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Risk Distribution</h3>
                                <p className="text-xs text-gray-500 mb-4">Distribution status of reviewed documents</p>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xxs font-bold text-gray-500 mb-1">
                                        <span>CRITICAL RISK (&gt;70%)</span>
                                        <span>{highRiskCount} {highRiskCount === 1 ? 'doc' : 'docs'}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(highRiskCount / analyzedContracts.length) * 100}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xxs font-bold text-gray-500 mb-1">
                                        <span>WARNING RISK (40%-70%)</span>
                                        <span>{medRiskCount} {medRiskCount === 1 ? 'doc' : 'docs'}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(medRiskCount / analyzedContracts.length) * 100}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xxs font-bold text-gray-500 mb-1">
                                        <span>FAVORABLE RISK (&lt;40%)</span>
                                        <span>{lowRiskCount} {lowRiskCount === 1 ? 'doc' : 'docs'}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(lowRiskCount / analyzedContracts.length) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Category Heatmap</h3>
                                <p className="text-xs text-gray-500 mb-4">Frequency of clause warnings caught</p>
                            </div>

                            <div className="space-y-2">
                                {Object.entries(riskCategories).map(([key, cat]) => {
                                    const widthPct = (cat.count / maxCategoryCount) * 100;
                                    return (
                                        <div key={key} className="flex items-center text-xs">
                                            <span className="w-28 text-[11px] font-semibold text-gray-600 truncate">{cat.label}</span>
                                            <div className="flex-1 ml-2 bg-gray-100 h-3 rounded overflow-hidden relative">
                                                <div className={`h-full ${cat.color} transition-all duration-700`} style={{ width: `${widthPct}%` }} />
                                            </div>
                                            <span className="w-6 text-right font-bold text-gray-800 ml-2">{cat.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}

                {showAnalytics && analyzedContracts.length === 0 && (
                    <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-500 text-xs mb-8">
                        📊 Analytics visualizations will generate automatically here after analyzing your first few contracts.
                    </div>
                )}

                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                   
                    <div className={`space-y-8 transition-all duration-300 ${activeChatContract ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                        
                        
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Analyze New Contract</h2>
                                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">Secure Local Processing</span>
                            </div>
                            
                            {uiError && (
                                <div className="mb-4 bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg text-xs font-medium flex justify-between items-center">
                                    <span>{uiError}</span>
                                    <button onClick={() => setUiError('')} className="text-red-400 hover:text-red-600 font-bold">×</button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700">Contract Title</label>
                                    <input 
                                        type="text"
                                        value={data.title}
                                        onChange={e => setData('title', e.target.value)}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                        placeholder="e.g., Freelance App Developer Agreement"
                                    />
                                    {errors.title && <div className="text-red-500 text-xs mt-1">{errors.title}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700">Short Description</label>
                                    <input 
                                        type="text"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                        placeholder="Checking for predatory clauses and payment milestones."
                                    />
                                    {errors.description && <div className="text-red-500 text-xs mt-1">{errors.description}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Contract Document</label>
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 rounded-xl transition-colors duration-200 ${
                                            isDragging 
                                                ? 'border-indigo-500 bg-indigo-50' 
                                                : fileName 
                                                    ? 'border-green-400 bg-green-50/50' 
                                                    : 'border-gray-300 border-dashed hover:border-gray-400'
                                        }`}
                                    >
                                        <div className="space-y-1 text-center">
                                            <svg className={`mx-auto h-10 w-10 ${fileName ? 'text-green-500' : 'text-gray-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20L28 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M28 8v12h12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label className="relative cursor-pointer bg-white rounded-md font-semibold text-indigo-600 hover:text-indigo-500">
                                                    <span>{fileName ? 'Change selected PDF' : 'Upload a contract PDF'}</span>
                                                    <input type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                                                </label>
                                                {!fileName && <p className="pl-1 text-gray-500">or drag and drop</p>}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {fileName ? `Loaded: ${fileName}` : 'Standard Text PDFs up to 10MB'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                              
                                {!fileName && (
                                    <div className="space-y-1 pt-1">
                                        <div className="relative flex py-2 items-center">
                                            <div className="flex-grow border-t border-gray-200 animate-pulse"></div>
                                            <span className="flex-shrink mx-4 text-gray-400 text-xxs font-bold uppercase tracking-wider">Or Paste Contract Text</span>
                                            <div className="flex-grow border-t border-gray-200"></div>
                                        </div>
                                        <textarea
                                            rows="5"
                                            value={data.body}
                                            onChange={e => setData('body', e.target.value)}
                                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-xs"
                                            placeholder="Paste contract parameters or raw legal text strings directly here..."
                                        ></textarea>
                                    </div>
                                )}
                                {errors.body && <div className="text-red-500 text-xs mt-1">{errors.body}</div>}
                                {errors.contract_file && <div className="text-red-500 text-xs mt-1">{errors.contract_file}</div>}

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="inline-flex justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                                    >
                                        {processing ? 'AI Scanning System...' : 'Run AI Analysis'}
                                    </button>
                                </div>
                            </form>
                        </div>

                       
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">Analysis History</h3>
                            {contractList.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 text-sm">
                                    No contracts analyzed yet. Upload a contract to start audit trace.
                                </div>
                            ) : (

                                contractList.map((contract) => (
                                    <div key={contract.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md animate-fade-in">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-base font-bold text-gray-900">{contract.title}</h4><h5>with Id {contract.id}</h5>
                                                
                                                <p className="text-xs text-gray-500 mt-1">{contract.desc}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                
                                                <button
                                                    onClick={() => startChatSession(contract)}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1 border transition-colors ${
                                                        activeChatContract?.id === contract.id 
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                                            : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                                                    }`}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    <span>Chat with AI</span>
                                                </button>
                                                <span className={`px-2.5 py-1.5 rounded-full text-xxs font-bold uppercase tracking-wider ${
                                                    contract.status === 'review' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                    {contract.status}
                                                </span>
                                                <div key={contract.id}>


                                                     <button 
                                                             onClick={() => deleteContract(contract.id)}
                                                             className="text-red-600 hover:text-red-800"
                                                                                     >
                                                                       Delete
                                                                </button>
                                                </div>
                                            </div>
                                        </div>

                                        {contract.analysis && (
                                            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                                <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                                                    <span className="font-semibold text-gray-600">Compliance Scoring Check:</span>
                                                    <span className={`font-bold px-2 py-0.5 rounded-md ${
                                                        contract.analysis.risk_score > 60 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                                    }`}>{contract.analysis.risk_score}% Risk</span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-semibold text-gray-800 block mb-1">Audit Verdict:</span>
                                                    <p className="leading-relaxed text-gray-700 bg-white p-2.5 rounded-md border border-gray-100">{contract.analysis.verdict}</p>
                                                </div>
                                                {contract.analysis.key_findings && (
                                                    <div>
                                                        <span className="font-semibold text-gray-800 text-xs block mb-1.5">Compliance Observations:</span>
                                                        <ul className="space-y-1.5">
                                                            {contract.analysis.key_findings.map((finding, idx) => (
                                                                <li key={idx} className="text-xs flex items-start text-gray-600">
                                                                    <span className="text-indigo-500 mr-2 font-black">•</span>
                                                                    <span className="leading-normal">{finding}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                  
                    {activeChatContract && (
                        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl shadow-lg sticky top-6 h-[85vh] flex flex-col overflow-hidden animate-slide-in">
                            
                           
                            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
                                <div className="truncate">
                                    <div className="text-xxs font-semibold uppercase tracking-wider text-indigo-700">Contract Assistant</div>
                                    <h3 className="text-sm font-bold text-gray-900 truncate" title={activeChatContract.title}>
                                        {activeChatContract.title}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setActiveChatContract(null)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
                                {chatMessages.map((msg, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                                            msg.role === 'user' 
                                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                                : msg.role === 'error'
                                                    ? 'bg-red-50 text-red-700 border border-red-100'
                                                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isAILoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white text-gray-500 rounded-xl rounded-bl-none px-4 py-3 text-xs border border-gray-100 flex items-center space-x-2">
                                            <div className="flex space-x-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                            <span>Analyzing contract clauses...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                           
                            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="text"
                                        value={currentQuestion}
                                        onChange={e => setCurrentQuestion(e.target.value)}
                                        placeholder="Ask a question about this contract..."
                                        disabled={isAILoading}
                                        className="flex-1 min-w-0 rounded-lg border-gray-300 shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs py-2 px-3 disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isAILoading || !currentQuestion.trim()}
                                        className="inline-flex items-center justify-center p-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="text-[10px] text-gray-400 text-center mt-2">
                                    Private Offline Chat Session
                                </div>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    </AuthenticatedLayout>
);
}
