import { FileText, UserCheck, Users, Pin, Star } from 'lucide-react';

export type FilterCategory = 'all' | 'owned' | 'shared' | 'favorites' | 'pinned';

interface DashboardStatCardsProps {
  allCount: number;
  ownedCount: number;
  sharedCount: number;
  recentCount: number;
  pinnedCount?: number;
  favoriteCount?: number;
  activeCategory?: FilterCategory;
  onSelectCategory?: (category: FilterCategory) => void;
}

export const DashboardStatCards = ({
  allCount,
  ownedCount,
  sharedCount,
  pinnedCount = 0,
  favoriteCount = 0,
  activeCategory = 'all',
  onSelectCategory,
}: DashboardStatCardsProps) => {
  const stats: Array<{
    id: FilterCategory;
    title: string;
    count: number;
    subtitle: string;
    icon: any;
    bgColor: string;
    iconColor: string;
    activeBorder: string;
  }> = [
    {
      id: 'all',
      title: 'All Documents',
      count: allCount,
      subtitle: 'Across workspace',
      icon: FileText,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      activeBorder: 'ring-2 ring-purple-500 border-purple-300 dark:border-purple-600',
    },
    {
      id: 'owned',
      title: 'Owned by me',
      count: ownedCount,
      subtitle: 'Created by you',
      icon: UserCheck,
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      activeBorder: 'ring-2 ring-emerald-500 border-emerald-300 dark:border-emerald-600',
    },
    {
      id: 'shared',
      title: 'Shared with me',
      count: sharedCount,
      subtitle: 'Collaborations',
      icon: Users,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      activeBorder: 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-600',
    },
    {
      id: 'favorites',
      title: 'Favorites',
      count: favoriteCount,
      subtitle: 'Starred documents',
      icon: Star,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      activeBorder: 'ring-2 ring-amber-500 border-amber-300 dark:border-amber-600',
    },
    {
      id: 'pinned',
      title: 'Pinned',
      count: pinnedCount,
      subtitle: 'Quick access',
      icon: Pin,
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      activeBorder: 'ring-2 ring-indigo-500 border-indigo-300 dark:border-indigo-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeCategory === stat.id;
        return (
          <button
            key={stat.id}
            type="button"
            onClick={() => onSelectCategory?.(stat.id)}
            className={`text-left w-full bg-white dark:bg-gray-800/90 rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer focus:outline-none ${
              isActive
                ? stat.activeBorder
                : 'border-gray-100 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
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
          </button>
        );
      })}
    </div>
  );
};
