import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  LayoutDashboard, 
  Users,
  UserCircle,
  UtensilsCrossed, 
  ShoppingCart, 
  Package, 
  Flame,
  ChefHat
} from 'lucide-react';

const getMobileNav = (role) => {
  const adminManager = [
    { to: '/dashboard', label: 'T.Quan', icon: LayoutDashboard },
    { to: '/employees', label: 'Nhân sự', icon: Users },
    { to: '/customers', label: 'Khách', icon: UserCircle },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/pos', label: 'POS', icon: ShoppingCart },
    { to: '/inventory', label: 'Kho', icon: Package },
    { to: '/kitchen', label: 'Bếp', icon: Flame },
    { to: '/profile', label: 'Hồ sơ', icon: ChefHat },
  ];
  
  const staff = [
    { to: '/pos', label: 'POS', icon: ShoppingCart },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/inventory', label: 'Kho', icon: Package },
    { to: '/profile', label: 'Hồ sơ', icon: ChefHat },
  ];
  
  const kitchen = [
    { to: '/kitchen', label: 'Bếp', icon: Flame },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/inventory', label: 'Kho', icon: Package },
    { to: '/profile', label: 'Hồ sơ', icon: ChefHat },
  ];

  if (role === 'ADMIN' || role === 'MANAGER') return adminManager;
  if (role === 'STAFF') return staff;
  if (role === 'KITCHEN') return kitchen;
  
  return staff; // Default fallback
};

export default function BottomNav() {
  const role = useAuthStore(s => s.role);
  const items = getMobileNav(role);

  return (
    <nav 
      className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 h-[60px] px-1 flex items-center justify-between z-[9999] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
      style={{ touchAction: 'manipulation' }}
      aria-label="Mobile Navigation"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 min-w-0 w-full h-full gap-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500
            ${isActive ? 'text-red-500' : 'text-gray-400 hover:text-gray-900'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon 
                size={items.length > 5 ? 18 : 22} 
                className={`transition-transform ${isActive ? 'scale-110 stroke-[2.5px]' : 'scale-100 stroke-[2px]'}`} 
                aria-hidden="true"
              />
              <span className={`text-[9px] font-bold truncate w-full text-center px-0.5 ${isActive ? 'opacity-100' : 'opacity-90'} ${items.length > 5 ? 'text-[8px] tracking-tighter' : ''}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
