import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Heart, BarChart3, ShieldCheck, PlusCircle } from 'lucide-react';

function OnboardingJourney({ onComplete, onSkip }) {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to Timental",
            description: "Your private, daily mental health check in. Let's take a quick look of how to get the most out of your journey.",
            icon: <Heart size={48} className="text-red-500" />,
            color: "bg-red-50"
        },
        {
            title: "Check in every day",
            description: "Each day you can rate your day out of 10 and check in on the factors that drive happiness. Set a daily notification to remind you (for instance at 8pm everyday).",
            icon: <PlusCircle size={48} className="text-[#126E5E]" />,
            color: "bg-emerald-50"
        },
        {
            title: "Review your week",
            description: "At the end of each week review how your week went. Identify patterns in the factors that affect your well-being.",
            icon: <BarChart3 size={48} className="text-blue-500" />,
            color: "bg-blue-50"
        },
        {
            title: "100% private",
            description: "Your data never leaves your device. It's stored locally in your browser. Use the export tool to keep your own backups.",
            icon: <ShieldCheck size={48} className="text-purple-500" />,
            color: "bg-purple-50"
        }
    ];

    const currentStep = steps[step];
    const isLastStep = step === steps.length - 1;

    const nextStep = () => {
        if (isLastStep) {
            onComplete();
        } else {
            setStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        setStep(prev => Math.max(0, prev - 1));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

                {/* Top Progress Bar */}
                <div className="flex h-1.5 w-full bg-gray-100">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 transition-all duration-500 ${i <= step ? 'bg-[#126E5E]' : 'bg-transparent'}`}
                        />
                    ))}
                </div>

                <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div className={`p-4 rounded-2xl ${currentStep.color}`}>
                            {currentStep.icon}
                        </div>
                        <button
                            onClick={onSkip}
                            className="p-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 mb-3">
                        {currentStep.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed text-lg mb-10">
                        {currentStep.description}
                    </p>

                    <div className="flex gap-3">
                        {step > 0 && (
                            <button
                                onClick={prevStep}
                                className="flex-1 btn-secondary text-lg"
                            >
                                <ChevronLeft size={20} className="mr-1" />
                                Back
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            className="flex-[2] btn-primary text-lg flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#126E5E' }}
                        >
                            {isLastStep ? (
                                <>
                                    Get Started
                                    <CheckCircle2 size={20} />
                                </>
                            ) : (
                                <>
                                    Next
                                    <ChevronRight size={20} />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 flex justify-center gap-2">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'w-6 bg-[#126E5E]' : 'bg-gray-200'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OnboardingJourney;
