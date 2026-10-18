// Icônes SVG simples (remplacent les emojis)
const P = {
  home: 'M12 3 3 10.5V21h6.5v-6.5h5V21H21V10.5L12 3z',
  plus: 'M12 5v14M5 12h14',
  user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm-8 9c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.800 12 21 12 21zm0-8.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z',
  phone: 'M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  chat: 'M4 5h16v11H9l-5 4V5z',
  heart: 'M12 20.500S4 15.200 4 9.300A4.300 4.300 0 0 1 12 7a4.300 4.300 0 0 1 8 2.300c0 5.900-8 11.200-8 11.200z',
  share: 'M14 4l7 7-7 7v-4c-6 0-9 2-11 6 1-7 4-11 11-12V4z',
  flag: 'M5 21V4m0 0h12l-2 4 2 4H5',
  bell: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2zm4 4h4',
  check: 'M5 12.500l4.500 4.500L19 7.500',
  search: 'M10.500 17a6.500 6.500 0 1 1 0-13 6.500 6.500 0 0 1 0 13zm5-1.500L20 20',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
};

export default function Icon({ n, size = 22, fill = false, sw = 2, className = '' }) {
  return (
    <svg
      className={'ico ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[n]} />
    </svg>
  );
}
