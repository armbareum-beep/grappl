import React from 'react';
import { TrainingRoutinesTab } from '../components/arena/TrainingRoutinesTab';

export const MyRoutines: React.FC = () => {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:pl-28 pt-8 pb-20 px-6 md:px-10">
            <h1 className="text-3xl font-bold mb-6 text-white">훈련 루틴</h1>
            <TrainingRoutinesTab />
        </div>
    );
};
