// 모바일 메뉴 토글
const menuToggle = document.getElementById('menuToggle');
const navMobile = document.getElementById('navMobile');
const header = document.getElementById('header');

menuToggle.addEventListener('click', () => {
    navMobile.classList.toggle('active');
    menuToggle.classList.toggle('active');
});

// 모바일 메뉴 링크 클릭시 메뉴 닫기
const mobileLinks = document.querySelectorAll('.nav-mobile a');
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMobile.classList.remove('active');
        menuToggle.classList.remove('active');
    });
});

// 스크롤시 헤더 스타일 변경
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        header.style.padding = '10px 0';
        header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    } else {
        header.style.padding = '20px 0';
        header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    }

    lastScroll = currentScroll;
});

// 부드러운 스크롤
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// 스크롤 애니메이션
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
        }
    });
}, observerOptions);

// 관찰할 요소들
document.querySelectorAll('.program-card, .feature-item, .instructor-content, .contact-grid').forEach(el => {
    observer.observe(el);
});

// 현재 활성화된 네비게이션 표시
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-desktop a, .nav-mobile a');

window.addEventListener('scroll', () => {
    let current = '';
    const scrollPosition = window.pageYOffset + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// 페이지 로드시 애니메이션
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});
