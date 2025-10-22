import React, { useEffect } from 'react';
import { Card, CardBody } from '@heroui/react';
import { FiCheckCircle, FiX, FiAlertCircle, FiInfo } from 'react-icons/fi';

const Notification = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          gradient: 'from-amber-400 to-yellow-600',
          icon: '✅',
          bgGradient: 'from-amber-300/30 to-yellow-500/30',
        };
      case 'error':
        return {
          gradient: 'from-red-500 to-rose-600',
          icon: '❌',
          bgGradient: 'from-red-500/20 to-rose-500/20',
        };
      case 'warning':
        return {
          gradient: 'from-amber-500 to-orange-600',
          icon: '⚠️',
          bgGradient: 'from-amber-400/30 to-orange-500/30',
        };
      default:
        return {
          gradient: 'from-amber-400 to-yellow-600',
          icon: 'ℹ️',
          bgGradient: 'from-amber-300/30 to-yellow-500/30',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div className="fixed top-16 right-4 z-50 animate-fadeIn">
      <Card className={`card-flat border-black/20 shadow max-w-sm`}>
        <CardBody className="p-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`p-1.5 rounded-md bg-black/10 flex-shrink-0`}>
              {type === 'success' && <FiCheckCircle className="w-6 h-6 text-white" />}
              {type === 'warning' && <FiAlertCircle className="w-6 h-6 text-white" />}
              {type === 'error' && <FiAlertCircle className="w-6 h-6 text-white" />}
              {type === 'info' && <FiInfo className="w-6 h-6 text-white" />}
            </div>
            
            {/* Message */}
            <div className="flex-1 pt-1">
              <p className="text-black font-semibold text-sm leading-relaxed">{message}</p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-black/10 rounded-md transition-colors"
            >
              <FiX className="w-4 h-4 text-black" />
            </button>
          </div>
        </CardBody>
      </Card>
      
      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-shrink {
          animation: shrink 5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default Notification;

