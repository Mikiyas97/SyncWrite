import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

export const Avatar = ({ name, color, size = 'md', className }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none',
          sizeClasses[size]
        ),
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
};
