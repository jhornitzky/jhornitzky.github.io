import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Heart, BarChart3, ShieldCheck, PlusCircle, Bell, CalendarPlus } from 'lucide-react';
import { getCalendarSettings, saveCalendarTime, downloadCalendarReminder, getGoogleCalendarUrl, getOutlookCalendarUrl } from '../utils/notifications';

function OnboardingJourney({ onComplete, onSkip }) {
    const [step, setStep] = useState(0);
    const [reminderTime, setReminderTime] = useState('20:00');
    const [isAdding, setIsAdding] = useState(false);

    // Load saved time when component mounts
    useState(() => {
        getCalendarSettings().then(({ time }) => setReminderTime(time));
    });

    const REMINDER_STEP = 2;

    const steps = [
        {
            title: "Welcome to Timental",
            description: "Your private, daily mental health check in. Let's take a quick look of how to get the most out of your journey.",
            icon: <Heart size={48} className="text-red-500" />,
            color: "bg-red-50"
        },
        {
            title: "Check in every day",
            description: "Each day you can rate your day out of 10 and check in on the factors that drive happiness.",
            icon: <PlusCircle size={48} className="text-[#126E5E]" />,
            color: "bg-emerald-50"
        },
        {
            title: "Set a daily reminder",
            description: "Add a repeating reminder to your calendar so you never forget to log your day.",
            icon: <Bell size={48} className="text-amber-500" />,
            color: "bg-amber-50"
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

    const handleTimeChange = (newTime) => {
        setReminderTime(newTime);
        saveCalendarTime(newTime);
    };

    const handleAddToCalendar = () => {
        setIsAdding(true);
        downloadCalendarReminder(reminderTime);
        setTimeout(() => setIsAdding(false), 1500);
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
                    <p className="text-gray-600 leading-relaxed text-lg mb-6">
                        {currentStep.description}
                    </p>

                    {step === REMINDER_STEP && (
                        <div className="space-y-2 mb-6">
                            <input
                                type="time"
                                value={reminderTime}
                                onChange={(e) => handleTimeChange(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126E5E] focus:border-transparent text-gray-900"
                            />
                            <button
                                onClick={handleAddToCalendar}
                                disabled={isAdding}
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200 disabled:opacity-50"
                            >
                                <CalendarPlus size={16} />
                                {isAdding ? 'Opening calendar...' : 'Apple / ICS Calendar'}
                            </button>
                            <a
                                href={getGoogleCalendarUrl(reminderTime)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                            >
                                Google Calendar
                            </a>
                            <a
                                href={getOutlookCalendarUrl(reminderTime)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                            >
                                Outlook
                            </a>
                        </div>
                    )}

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
