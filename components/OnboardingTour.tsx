import React, { useEffect, useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { UserRole } from '../types';

interface TourStep {
  id: string;
  element?: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  role: UserRole;
  onComplete: () => void;
  onSkip?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ 
  role, 
  onComplete, 
  onSkip 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const getTourSteps = (): TourStep[] => {
    const commonSteps: TourStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to NexaFya! 👋',
        description: 'Your comprehensive health platform. Let\'s take a quick tour to get you started.',
        position: 'bottom',
      },
    ];

    switch (role) {
      case UserRole.PATIENT:
        return [
          ...commonSteps,
          {
            id: 'dashboard',
            element: '[data-tour="dashboard"]',
            title: 'Your Dashboard',
            description: 'Here you can see your upcoming appointments, health trends, and quick access to all features.',
            position: 'bottom',
          },
          {
            id: 'symptom-checker',
            element: '[data-tour="symptom-checker"]',
            title: 'AI Symptom Checker',
            description: 'Get instant health insights with our AI-powered symptom checker. It\'s free and available 24/7.',
            position: 'right',
          },
          {
            id: 'care-center',
            element: '[data-tour="care-center"]',
            title: 'Care Center',
            description: 'Book appointments with doctors, schedule lab tests, and access emergency services.',
            position: 'right',
          },
          {
            id: 'pharmacy',
            element: '[data-tour="pharmacy"]',
            title: 'Pharmacy',
            description: 'Order medications and have them delivered to your doorstep.',
            position: 'right',
          },
        ];
      case UserRole.DOCTOR:
        return [
          ...commonSteps,
          {
            id: 'dashboard',
            element: '[data-tour="dashboard"]',
            title: 'Doctor Dashboard',
            description: 'Monitor your patients, upcoming consultations, and earnings all in one place.',
            position: 'bottom',
          },
          {
            id: 'consultations',
            element: '[data-tour="consultations"]',
            title: 'Consultations',
            description: 'Manage your schedule, view patient history, and conduct video consultations.',
            position: 'right',
          },
          {
            id: 'articles',
            element: '[data-tour="articles"]',
            title: 'Publish Articles',
            description: 'Share your medical expertise and earn from premium content.',
            position: 'right',
          },
        ];
      case UserRole.PHARMACY:
        return [
          ...commonSteps,
          {
            id: 'dashboard',
            element: '[data-tour="dashboard"]',
            title: 'Pharmacy Dashboard',
            description: 'Track orders, manage inventory, and monitor sales performance.',
            position: 'bottom',
          },
          {
            id: 'orders',
            element: '[data-tour="orders"]',
            title: 'Orders',
            description: 'View and process prescription orders from patients and doctors.',
            position: 'right',
          },
          {
            id: 'inventory',
            element: '[data-tour="inventory"]',
            title: 'Inventory',
            description: 'Manage your stock levels, track expiry dates, and add new items.',
            position: 'right',
          },
        ];
      default:
        return commonSteps;
    }
  };

  const steps = getTourSteps();
  const currentStepData = steps[currentStep];

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompleted = localStorage.getItem(`nexafya_onboarding_${role}`);
    if (hasCompleted) {
      setIsVisible(false);
      onComplete();
    }
  }, [role, onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`nexafya_onboarding_${role}`, 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(`nexafya_onboarding_${role}`, 'skipped');
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible || !currentStepData) return null;

  // Calculate position for overlay
  const getOverlayStyle = () => {
    if (currentStepData.element) {
      const element = document.querySelector(currentStepData.element);
      if (element) {
        const rect = element.getBoundingClientRect();
        return {
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        };
      }
    }
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'auto',
      height: 'auto',
    };
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
        onClick={handleSkip}
        aria-hidden="true"
      />
      
      {/* Highlight Box */}
      {currentStepData.element && (
        <div
          className="fixed z-[9999] border-4 border-blue-500 rounded-2xl pointer-events-none animate-in zoom-in-95 duration-300"
          style={getOverlayStyle()}
        />
      )}

      {/* Tooltip */}
      <div className="fixed z-[10000] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div
          className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm mx-4"
          style={
            currentStepData.element
              ? {
                  position: 'fixed',
                  ...(currentStepData.position === 'top'
                    ? { bottom: 'calc(100vh - 200px)' }
                    : currentStepData.position === 'right'
                    ? { left: 'calc(50vw + 100px)' }
                    : currentStepData.position === 'left'
                    ? { right: 'calc(50vw + 100px)' }
                    : { top: 'calc(50vh + 100px)' }),
                }
              : {
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }
          }
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {currentStepData.description}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-4"
              aria-label="Skip tour"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-blue-600'
                      : index < currentStep
                      ? 'w-2 bg-blue-300'
                      : 'w-2 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Complete <Check size={16} />
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

