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
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface AiAnalysis {
    risk_score: number;
    key_findings: string[];
    verdict: string;
}

interface Contract {
    id: number;
    title: string;
    description: string | null;
    status: string;
    body: string;
    analysis: AiAnalysis | null; // Intercept our new JSON structure
}

interface DashboardProps {
    contracts: Contract[];
}

export default function Dashboard({ contracts = [] }: DashboardProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        body: 'This agreement is made between Party A and Party B...',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('contracts.store'), {
            onSuccess: () => reset('title', 'description'),
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">AI Contracts Core Hub</h2>}
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Form Column */}
                    <div className="bg-white p-6 shadow sm:rounded-lg dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-fit">
                        <h3 className="text-lg font-medium mb-4">Analyze Contract</h3>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contract Text</label>
                                <textarea
                                    rows={6}
                                    value={data.body}
                                    onChange={(e) => setData('body', e.target.value)}
                                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 font-mono text-xs"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition"
                            >
                                {processing ? 'AI Scanning...' : 'Run AI Analysis'}
                            </button>
                        </form>
                    </div>

                    {/* Display Cards Column */}
                    <div className="md:col-span-2 bg-white p-6 shadow sm:rounded-lg dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        <h3 className="text-lg font-medium mb-4">Analyzed Platform Contracts ({contracts.length})</h3>
                        
                        {contracts.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400">No contracts analyzed yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {contracts.map((contract) => (
                                    <div key={contract.id} className="border border-gray-200 dark:border-gray-700 p-5 rounded-lg bg-gray-50 dark:bg-gray-900 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-xl text-indigo-600 dark:text-indigo-400">{contract.title}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{contract.description}</p>
                                            </div>
                                            <span className="px-2 py-1 text-xs font-semibold uppercase rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {contract.status}
                                            </span>
                                        </div>

                                        {/* AI Feedback Presentation Section */}
                                        {contract.analysis && (
                                            <div className="mt-4 border-t border-dashed border-gray-300 dark:border-gray-700 pt-3">
                                                <div className="flex items-center space-x-4 mb-2">
                                                    <span className={`px-2 py-1 text-xs font-bold rounded ${contract.analysis.risk_score > 50 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                                        AI Risk Score: {contract.analysis.risk_score}%
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Verdict: <span className="italic font-normal">{contract.analysis.verdict}</span>
                                                    </span>
                                                </div>
                                                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                    {contract.analysis.key_findings.map((finding, idx) => (
                                                        <li key={idx}>{finding}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}