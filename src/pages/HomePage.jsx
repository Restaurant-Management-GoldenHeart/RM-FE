/**
 * HomePage.jsx
 * Trang chủ public — hiển thị khi user chưa đăng nhập.
 * Tất cả section nằm trong một trang cuộn dọc duy nhất.
 */
import { useState, useEffect } from 'react';

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

export default function HomePage() {
  // Door intro chỉ hiện 1 lần / session
  const [showDoor, setShowDoor] = useState(() => !sessionStorage.getItem('gh_door_seen'));

  const handleDoorDone = () => {
    sessionStorage.setItem('gh_door_seen', '1');
    setShowDoor(false);
  };

  // Override body background cho dark theme trang chủ
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
      {/* Door opening intro — first visit only */}
      {showDoor && <DoorIntro onComplete={handleDoorDone} />}

      {/* Fixed navigation */}
      <HomeNavbar />

      {/* Page sections */}
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
    </div>
  );
}
