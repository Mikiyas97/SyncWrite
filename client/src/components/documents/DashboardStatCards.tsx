import { FileText, UserCheck, Users, Clock } from 'lucide-react';

interface DashboardStatCardsProps {
  allCount: number;
  ownedCount: number;
  sharedCount: number;
  recentCount: number;
}

export const DashboardStatCards = ({
  allCount,
  ownedCount,
  sharedCount,
  recentCount,
}: DashboardStatCardsProps) => {
  const stats = [
    {
      id: 'all',
      title: 'All Documents',
      count: allCount,
      subtitle: 'Across all workspaces',
      icon: FileText,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'owned',
      title: 'Owned by me',
      count: ownedCount,
      subtitle: 'Documents you created',
      icon: UserCheck,
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'shared',
      title: 'Shared with me',
      count: sharedCount,
      subtitle: 'Documents shared with you',
      icon: Users,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'recent',
      title: 'Recently Opened',
      count: recentCount,
      subtitle: 'In the last 7 days',
      icon: Clock,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                {stat.title}
              </p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stat.count}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stat.subtitle}
              </p>
            </div>
            <div className={`p-3.5 rounded-2xl ${stat.bgColor} flex items-center justify-center shrink-0`}>
              <Icon className={`h-6 w-6 ${stat.iconColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
