import React from 'react';
import { Card, CardBody, Spinner } from '@heroui/react';

const LoadingOverlay = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <Card className="max-w-md w-full mx-4 glass-effect border-white/20 shadow-2xl animate-scaleIn">
        <CardBody className="p-10">
          <div className="flex flex-col items-center space-y-6">
            {/* Animated Spinner */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur-xl opacity-75 animate-pulse" />
              <div className="relative">
                <Spinner size="lg" color="warning" />
              </div>
            </div>
            
            {/* Message */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-amber-200 mb-2">Processing...</h3>
              <p className="text-amber-100/90 text-lg">{message}</p>
            </div>

            {/* Animated dots */}
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-amber-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default LoadingOverlay;

