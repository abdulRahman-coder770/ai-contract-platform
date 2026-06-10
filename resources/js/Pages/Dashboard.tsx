// import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
// import { Head } from '@inertiajs/react';

// export default function Dashboard() {
//     return (
//         <AuthenticatedLayout
//             header={
//                 <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
//                     Dashboard
//                 </h2>
//             }
//         >
//             <Head title="Dashboard" />

//             <div className="py-12">
//                 <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
//                     <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
//                         <div className="p-6 text-gray-900 dark:text-gray-100">
//                             You're logged in!
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </AuthenticatedLayout>
//     );
// }
import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Dashboard({ auth, contracts }) {
    // 1. Initialize Inertia form state with fields for text and file upload
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        body: '',
        contract_file: null, // Holds the raw binary PDF file object
    });

    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');

    // 2. Handle Drag Events for Visual State Changes
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    // 3. Process Dropped Files
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setData('contract_file', file);
            setFileName(file.name);
            // Clear text body if a file is dropped to prioritize file parsing
            setData(prev => ({ ...prev, contract_file: file, body: '' }));
        } else {
            alert('Please drop a valid PDF file.');
        }
    };

    // 4. Process File Selection via standard File Dialog Click
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setData('contract_file', file);
            setFileName(file.name);
            setData(prev => ({ ...prev, contract_file: file, body: '' }));
        }
    };

    // 5. Submit Form to Laravel Backend via Inertia
    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('contracts.store'), {
            onSuccess: () => {
                reset();
                setFileName('');
            }
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    
                    {/* Contract Submission Card */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Analyze New Contract</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Contract Title</label>
                                <input 
                                    type="text"
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    placeholder="Checking for predatory clauses and payment milestones."
                                />
                                {errors.description && <div className="text-red-500 text-xs mt-1">{errors.description}</div>}
                            </div>

                            {/* Drag and Drop Zone Area */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Contract Document (PDF or Paste Text)</label>
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 rounded-md transition-colors duration-200 ${
                                        isDragging 
                                            ? 'border-indigo-500 bg-indigo-50' 
                                            : fileName 
                                                ? 'border-green-400 bg-green-50' 
                                                : 'border-gray-300 border-dashed hover:border-gray-400'
                                    }`}
                                >
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20L28 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M28 8v12h12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                                <span>{fileName ? 'Change PDF file' : 'Upload a PDF file'}</span>
                                                <input 
                                                    type="file" 
                                                    accept=".pdf" 
                                                    className="sr-only" 
                                                    onChange={handleFileChange} 
                                                />
                                            </label>
                                            {!fileName && <p className="pl-1 text-gray-500">or drag and drop</p>}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {fileName ? `Selected: ${fileName}` : 'Text-searchable PDFs up to 10MB'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Conditional Textarea Fallback (Only shows if no file is uploaded) */}
                            {!fileName && (
                                <div className="space-y-1">
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-gray-300"></div>
                                        <span className="flex-shrink mx-4 text-gray-400 text-xs font-semibold uppercase">Or Paste Text Directly</span>
                                        <div className="flex-grow border-t border-gray-300"></div>
                                    </div>
                                    <textarea
                                        rows="6"
                                        value={data.body}
                                        onChange={e => setData('body', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm"
                                        placeholder="Paste contract contents here if you do not have a PDF file..."
                                    ></textarea>
                                </div>
                            )}
                            {errors.body && <div className="text-red-500 text-xs mt-1">{errors.body}</div>}
                            {errors.contract_file && <div className="text-red-500 text-xs mt-1">{errors.contract_file}</div>}

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-opacity"
                                >
                                    {processing ? 'AI Analysis Scanning...' : 'Run AI Analysis'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Results / List Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Analysis History</h3>
                        {contracts.length === 0 ? (
                            <p className="text-gray-500 text-sm">No contracts scanned yet.</p>
                        ) : (
                            contracts.map((contract) => (
                                <div key={contract.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-md font-bold text-gray-900">{contract.title}</h4>
                                            <p className="text-sm text-gray-500 mt-0.5">{contract.description}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                            contract.status === 'review' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {contract.status}
                                        </span>
                                    </div>

                                    {/* AI Parsing Metrics Display */}
                                    {contract.analysis && (
                                        <div className="mt-4 bg-gray-50 p-4 rounded border border-gray-100 space-y-2">
                                            <div className="text-sm font-bold text-gray-700">
                                                AI Risk Score: <span className="text-red-600">{contract.analysis.risk_score}%</span>
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium">
                                                Verdict: <span className="text-gray-800">{contract.analysis.verdict}</span>
                                            </div>
                                            {contract.analysis.key_findings && (
                                                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pt-1 border-t border-gray-200 mt-2">
                                                    {contract.analysis.key_findings.map((finding, idx) => (
                                                        <li key={idx} className="leading-relaxed">{finding}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}