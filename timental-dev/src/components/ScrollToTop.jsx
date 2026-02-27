import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Don't scroll to top for the dashboard to allow Dashboard component to handle it
        if (pathname !== '/') {
            window.scrollTo(0, 0);
        }

        // Store the current path as prevPath when we leave this route
        return () => {
            sessionStorage.setItem('prevPath', pathname);
        };
    }, [pathname]);

    return null;
}
