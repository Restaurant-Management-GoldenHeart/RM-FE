import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import DoorIntro       from '../components/home/DoorIntro';
import HomeNavbar      from '../components/home/HomeNavbar';
import HeroSection     from '../components/home/HeroSection';
import StatsSection    from '../components/home/StatsSection';
import StorySection    from '../components/home/StorySection';
import MenuSection     from '../components/home/MenuSection';
import GallerySection  from '../components/home/GallerySection';
import ReviewsSection  from '../components/home/ReviewsSection';
import LocationSection from '../components/home/LocationSection';
import CtaBanner       from '../components/home/CtaBanner';
import HomeFooter      from '../components/home/HomeFooter';
import LoginModal      from '../components/home/LoginModal';
import RegisterModal   from '../components/home/RegisterModal';

export default function HomePage() {
  const location = useLocation();
  const [showDoor,   setShowDoor]   = useState(() => !sessionStorage.getItem('gh_door_seen'));
  const [authModal,  setAuthModal]  = useState(
    location.state?.openLogin ? 'login' : null
  );

  const handleDoorDone = () => {
    sessionStorage.setItem('gh_door_seen', '1');
    setShowDoor(false);
  };

  // Xóa openLogin khỏi history state sau khi đã đọc — tránh modal tự mở lại khi refresh
  useEffect(() => {
    if (location.state?.openLogin) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0a0906';
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.backgroundColor = prev;
      document.body.style.overflowX = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0906] overflow-x-hidden">
      {showDoor && <DoorIntro onComplete={handleDoorDone} />}

      <HomeNavbar
        onLoginClick={()    => setAuthModal('login')}
        onRegisterClick={() => setAuthModal('register')}
      />

      <main>
        <HeroSection />
        <StatsSection />
        <StorySection />
        <MenuSection />
        <GallerySection />
        <ReviewsSection />
        <LocationSection />
        <CtaBanner />
      </main>

      <HomeFooter />

      <LoginModal
        isOpen={authModal === 'login'}
        onClose={()          => setAuthModal(null)}
        onSwitchToRegister={() => setAuthModal('register')}
      />
      <RegisterModal
        isOpen={authModal === 'register'}
        onClose={()        => setAuthModal(null)}
        onSwitchToLogin={() => setAuthModal('login')}
      />
    </div>
  );
}
