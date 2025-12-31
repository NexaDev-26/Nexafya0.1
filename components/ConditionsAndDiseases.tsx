
import React, { useState, useEffect } from 'react';
import { Search, BookOpen, AlertCircle, Heart, Brain, Wind, Stomach, Eye, Bone, Droplet, Activity, ChevronRight, X, Info, ExternalLink, CheckCircle, Stethoscope } from 'lucide-react';
import { useNotification } from './NotificationSystem';

interface Condition {
  id: string;
  name: string;
  category: string;
  description: string;
  symptoms: string[];
  causes?: string[];
  treatments?: string[];
  prevention?: string[];
  severity: 'mild' | 'moderate' | 'severe';
  icon?: string;
}

// Mock data - In production, this would come from an API or database
const CONDITIONS_DATA: Condition[] = [
  {
    id: 'malaria',
    name: 'Malaria',
    category: 'Infectious Diseases',
    description: 'Malaria is a life-threatening disease caused by parasites that are transmitted to people through the bites of infected female Anopheles mosquitoes.',
    symptoms: ['Fever', 'Chills', 'Headache', 'Nausea', 'Vomiting', 'Muscle aches', 'Fatigue'],
    causes: ['Plasmodium parasite', 'Mosquito bites', 'Blood transfusion', 'Organ transplant'],
    treatments: ['Antimalarial medications (Artemisinin-based)', 'Quinine', 'Chloroquine (in some areas)', 'Supportive care'],
    prevention: ['Use mosquito nets', 'Apply insect repellent', 'Take antimalarial prophylaxis when traveling', 'Wear long-sleeved clothing'],
    severity: 'severe',
    icon: 'droplet'
  },
  {
    id: 'hypertension',
    name: 'Hypertension (High Blood Pressure)',
    category: 'Cardiovascular',
    description: 'Hypertension is a long-term medical condition in which the blood pressure in the arteries is persistently elevated.',
    symptoms: ['Often no symptoms', 'Headaches', 'Shortness of breath', 'Nosebleeds', 'Dizziness'],
    causes: ['Genetics', 'Age', 'Obesity', 'Lack of exercise', 'High salt intake', 'Alcohol consumption', 'Stress'],
    treatments: ['Lifestyle changes', 'ACE inhibitors', 'Beta-blockers', 'Diuretics', 'Calcium channel blockers'],
    prevention: ['Regular exercise', 'Healthy diet', 'Reduce salt intake', 'Maintain healthy weight', 'Limit alcohol', 'Quit smoking'],
    severity: 'moderate',
    icon: 'heart'
  },
  {
    id: 'diabetes',
    name: 'Diabetes (Type 2)',
    category: 'Metabolic',
    description: 'Type 2 diabetes is a chronic condition that affects the way the body processes blood sugar (glucose).',
    symptoms: ['Increased thirst', 'Frequent urination', 'Increased hunger', 'Fatigue', 'Blurred vision', 'Slow-healing sores'],
    causes: ['Insulin resistance', 'Genetics', 'Obesity', 'Lack of physical activity', 'Age', 'Poor diet'],
    treatments: ['Metformin', 'Insulin therapy', 'Other oral medications', 'Lifestyle modifications', 'Blood sugar monitoring'],
    prevention: ['Maintain healthy weight', 'Regular exercise', 'Healthy diet', 'Regular check-ups'],
    severity: 'moderate',
    icon: 'activity'
  },
  {
    id: 'typhoid',
    name: 'Typhoid Fever',
    category: 'Infectious Diseases',
    description: 'Typhoid fever is a bacterial infection caused by Salmonella typhi, typically spread through contaminated food or water.',
    symptoms: ['High fever', 'Weakness', 'Stomach pain', 'Headache', 'Loss of appetite', 'Rash'],
    causes: ['Salmonella typhi bacteria', 'Contaminated food or water', 'Poor sanitation', 'Close contact with infected person'],
    treatments: ['Antibiotics (Ciprofloxacin, Azithromycin)', 'Fluid replacement', 'Rest', 'Hospitalization in severe cases'],
    prevention: ['Vaccination', 'Safe food and water practices', 'Good hygiene', 'Proper sanitation'],
    severity: 'severe',
    icon: 'stomach'
  },
  {
    id: 'anemia',
    name: 'Anemia',
    category: 'Blood Disorders',
    description: 'Anemia is a condition in which you lack enough healthy red blood cells to carry adequate oxygen to your body\'s tissues.',
    symptoms: ['Fatigue', 'Weakness', 'Pale skin', 'Shortness of breath', 'Dizziness', 'Cold hands and feet'],
    causes: ['Iron deficiency', 'Vitamin B12 deficiency', 'Chronic diseases', 'Blood loss', 'Genetic conditions'],
    treatments: ['Iron supplements', 'Vitamin B12 supplements', 'Folate supplements', 'Blood transfusion (severe cases)', 'Treat underlying cause'],
    prevention: ['Iron-rich diet', 'Vitamin-rich foods', 'Regular check-ups', 'Treat underlying conditions'],
    severity: 'moderate',
    icon: 'droplet'
  },
  {
    id: 'asthma',
    name: 'Asthma',
    category: 'Respiratory',
    description: 'Asthma is a condition in which your airways narrow and swell and may produce extra mucus, making breathing difficult.',
    symptoms: ['Shortness of breath', 'Chest tightness', 'Wheezing', 'Coughing', 'Difficulty sleeping'],
    causes: ['Genetics', 'Allergies', 'Environmental factors', 'Respiratory infections', 'Exercise', 'Cold air'],
    treatments: ['Inhalers (bronchodilators)', 'Corticosteroids', 'Long-term control medications', 'Quick-relief medications', 'Allergy medications'],
    prevention: ['Avoid triggers', 'Use air purifiers', 'Regular exercise', 'Maintain healthy weight', 'Manage allergies'],
    severity: 'moderate',
    icon: 'lungs'
  },
  {
    id: 'pneumonia',
    name: 'Pneumonia',
    category: 'Respiratory',
    description: 'Pneumonia is an infection that inflames air sacs in one or both lungs, which may fill with fluid.',
    symptoms: ['Cough with phlegm', 'Fever', 'Chills', 'Shortness of breath', 'Chest pain', 'Fatigue'],
    causes: ['Bacteria', 'Viruses', 'Fungi', 'Weakened immune system', 'Chronic diseases'],
    treatments: ['Antibiotics (bacterial)', 'Antiviral medications (viral)', 'Fever reducers', 'Cough medicine', 'Rest', 'Fluids'],
    prevention: ['Vaccination', 'Good hygiene', 'Don\'t smoke', 'Healthy lifestyle', 'Avoid sick people'],
    severity: 'severe',
    icon: 'lungs'
  },
  {
    id: 'tuberculosis',
    name: 'Tuberculosis (TB)',
    category: 'Infectious Diseases',
    description: 'Tuberculosis is a serious infectious disease that mainly affects the lungs, caused by Mycobacterium tuberculosis.',
    symptoms: ['Persistent cough', 'Chest pain', 'Coughing up blood', 'Fatigue', 'Fever', 'Night sweats', 'Weight loss'],
    causes: ['Mycobacterium tuberculosis', 'Airborne transmission', 'Weakened immune system', 'Close contact with infected person'],
    treatments: ['Antibiotic treatment (6-9 months)', 'Isoniazid', 'Rifampin', 'Ethambutol', 'Pyrazinamide', 'Directly Observed Therapy (DOT)'],
    prevention: ['BCG vaccination', 'Early detection', 'Complete treatment', 'Good ventilation', 'Avoid close contact with infected'],
    severity: 'severe',
    icon: 'lungs'
  },
  {
    id: 'hiv-aids',
    name: 'HIV/AIDS',
    category: 'Infectious Diseases',
    description: 'HIV (Human Immunodeficiency Virus) attacks the immune system, and AIDS is the most advanced stage of HIV infection.',
    symptoms: ['Fever', 'Fatigue', 'Swollen lymph nodes', 'Rash', 'Sore throat', 'Muscle aches', 'Night sweats'],
    causes: ['Unprotected sexual contact', 'Sharing needles', 'Blood transfusion', 'Mother-to-child transmission', 'Occupational exposure'],
    treatments: ['Antiretroviral therapy (ART)', 'Pre-exposure prophylaxis (PrEP)', 'Post-exposure prophylaxis (PEP)', 'Regular monitoring'],
    prevention: ['Use condoms', 'Don\'t share needles', 'Get tested', 'Preventive medications', 'Safe blood practices'],
    severity: 'severe',
    icon: 'activity'
  },
  {
    id: 'arthritis',
    name: 'Arthritis',
    category: 'Musculoskeletal',
    description: 'Arthritis is inflammation of one or more joints, causing pain and stiffness that can worsen with age.',
    symptoms: ['Joint pain', 'Stiffness', 'Swelling', 'Redness', 'Decreased range of motion'],
    causes: ['Age', 'Genetics', 'Injury', 'Obesity', 'Autoimmune disorders', 'Infection'],
    treatments: ['Pain relievers', 'Anti-inflammatory medications', 'Physical therapy', 'Exercise', 'Surgery (severe cases)'],
    prevention: ['Maintain healthy weight', 'Regular exercise', 'Protect joints', 'Eat anti-inflammatory foods'],
    severity: 'moderate',
    icon: 'bone'
  }
];

const CATEGORIES = [
  'All',
  'Infectious Diseases',
  'Cardiovascular',
  'Metabolic',
  'Respiratory',
  'Blood Disorders',
  'Musculoskeletal',
  'Neurological'
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Infectious Diseases': return AlertCircle;
    case 'Cardiovascular': return Heart;
    case 'Metabolic': return Activity;
    case 'Respiratory': return Wind;
    case 'Blood Disorders': return Droplet;
    case 'Musculoskeletal': return Bone;
    case 'Neurological': return Brain;
    default: return BookOpen;
  }
};

interface ConditionsAndDiseasesProps {
  onNavigate?: (view: string) => void;
}

export const ConditionsAndDiseases: React.FC<ConditionsAndDiseasesProps> = ({ onNavigate }) => {
  const { notify } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);

  const filteredConditions = CONDITIONS_DATA.filter(condition => {
    const matchesSearch = condition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         condition.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         condition.symptoms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || condition.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'mild': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'severe': return AlertCircle;
      case 'moderate': return Info;
      case 'mild': return CheckCircle;
      default: return Info;
    }
  };

  if (selectedCondition) {
    const SeverityIcon = getSeverityIcon(selectedCondition.severity);
    const CategoryIcon = getCategoryIcon(selectedCondition.category);
    
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Back Button */}
        <button
          onClick={() => setSelectedCondition(null)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-bold"
        >
          <ChevronRight className="rotate-180" size={20} />
          Back to Conditions
        </button>

        {/* Condition Detail View */}
        <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                  <CategoryIcon className="text-teal-600 dark:text-teal-400" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">
                    {selectedCondition.name}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedCondition.category}</p>
                </div>
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${getSeverityColor(selectedCondition.severity)}`}>
                <SeverityIcon size={14} />
                {selectedCondition.severity.charAt(0).toUpperCase() + selectedCondition.severity.slice(1)} Condition
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Overview</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedCondition.description}</p>
          </div>

          {/* Symptoms */}
          {selectedCondition.symptoms && selectedCondition.symptoms.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-orange-500" />
                Symptoms
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCondition.symptoms.map((symptom, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{symptom}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Causes */}
          {selectedCondition.causes && selectedCondition.causes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Info size={20} className="text-blue-500" />
                Causes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCondition.causes.map((cause, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cause}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Treatments */}
          {selectedCondition.treatments && selectedCondition.treatments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" />
                Treatments
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCondition.treatments.map((treatment, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{treatment}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prevention */}
          {selectedCondition.prevention && selectedCondition.prevention.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Heart size={20} className="text-purple-500" />
                Prevention
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCondition.prevention.map((prevention, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{prevention}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Disclaimer:</strong> This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => onNavigate?.('care-center')}
              className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
            >
              <Stethoscope size={18} />
              Consult a Doctor
            </button>
            <button
              onClick={() => onNavigate?.('resources')}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <BookOpen size={18} />
              More Resources
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search conditions, diseases, or symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => {
            const CategoryIcon = getCategoryIcon(category);
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <CategoryIcon size={16} />
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filteredConditions.length === 0 ? (
          <div className="bg-white dark:bg-[#0F172A] rounded-[2.5rem] p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700/50">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No conditions found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {filteredConditions.length} {filteredConditions.length === 1 ? 'Condition' : 'Conditions'} Found
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConditions.map(condition => {
                const CategoryIcon = getCategoryIcon(condition.category);
                const SeverityIcon = getSeverityIcon(condition.severity);
                return (
                  <button
                    key={condition.id}
                    onClick={() => setSelectedCondition(condition)}
                    className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50 transition-colors">
                        <CategoryIcon className="text-teal-600 dark:text-teal-400" size={24} />
                      </div>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${getSeverityColor(condition.severity)}`}>
                        <SeverityIcon size={12} />
                        {condition.severity}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {condition.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{condition.category}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
                      {condition.description}
                    </p>
                    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                      Learn More
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
