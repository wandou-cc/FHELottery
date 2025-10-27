import React from 'react';
import { Card, CardBody, Chip } from '@heroui/react';

const StatusCards = ({ status, isWalletConnected = false }) => {
  const cards = [
    {
      title: 'Prize Pool',
      value: `${parseFloat(status.prizePool).toFixed(4)} ETH`,
      subtitle: isWalletConnected ? 'Total rewards' : 'Public data',
      icon: '💰',
      gradient: 'from-amber-400 to-yellow-600',
      bgGradient: 'from-amber-300/30 to-yellow-500/30',
      chipColor: 'warning',
      chipText: isWalletConnected ? 'Active' : 'Public'
    },
    {
      title: 'Draw Status',
      value: status.hasDrawn ? 'Completed' : 'Pending',
      subtitle: 'Current draw',
      icon: '🎯',
      gradient: status.hasDrawn ? 'from-emerald-400 to-green-600' : 'from-amber-400 to-orange-600',
      bgGradient: status.hasDrawn ? 'from-emerald-400/20 to-green-600/20' : 'from-amber-400/20 to-orange-500/20',
      chipColor: status.hasDrawn ? 'success' : 'warning',
      chipText: status.hasDrawn ? 'Drawn' : 'Not Drawn'
    },
    {
      title: 'Ticket Sales',
      value: status.isBuyingOpen ? 'Open' : 'Closed',
      subtitle: 'Purchase status',
      icon: '🎫',
      gradient: status.isBuyingOpen ? 'from-amber-400 to-yellow-600' : 'from-gray-400 to-gray-600',
      bgGradient: status.isBuyingOpen ? 'from-amber-400/20 to-yellow-500/20' : 'from-gray-500/20 to-gray-600/20',
      chipColor: status.isBuyingOpen ? 'warning' : 'default',
      chipText: status.isBuyingOpen ? 'Active' : 'Inactive'
    },
    {
      title: 'Round',
      value: `#${status.currentTicketId}`,
      subtitle: 'Current round',
      icon: '🔄',
      gradient: 'from-orange-400 to-amber-600',
      bgGradient: 'from-orange-400/20 to-amber-500/20',
      chipColor: 'warning',
      chipText: 'Live'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="card-flat"
          style={{ animationDelay: `${index * 0.1}s` }}
          isPressable
        >
          <CardBody className="p-4">
            <div className="space-y-2">
              {/* Icon and Chip */}
              <div className="flex items-center justify-between">
                <div className={`text-2xl px-2 py-1 rounded-md bg-black/10`}>{card.icon}</div>
                <Chip
                  color={card.chipColor}
                  variant="flat"
                  size="sm"
                  className="font-semibold text-black"
                >
                  {card.chipText}
                </Chip>
              </div>

              {/* Title and Value */}
              <div>
                <p className="text-xs text-black/70 font-medium mb-1">{card.title}</p>
                <div className={`text-2xl font-extrabold text-black mb-1`}>
                  {card.value}
                </div>
                <p className="text-xs text-black/60">{card.subtitle}</p>
              </div>

              {/* Progress bar for prize pool */}
              {index === 0 && (
                <div className="pt-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${card.gradient} rounded-full animate-shimmer`} style={{ width: '70%' }} />
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export default StatusCards;

