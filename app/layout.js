import './globals.css';

export const metadata = {
  title: 'Smart Waste Management System',
  description: 'A system for managing waste collection and optimizing collection routes in Chandigarh city using advanced routing algorithms',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
