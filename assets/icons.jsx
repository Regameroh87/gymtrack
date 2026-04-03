import Svg, { Path } from "react-native-svg";

export const Barbell = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-barbell ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="M4 7a1 1 0 0 1 1 1v8a1 1 0 0 1-2 0v-3H2a1 1 0 0 1 0-2h1V8a1 1 0 0 1 1-1M20 7a1 1 0 0 1 1 1v3h1a1 1 0 0 1 0 2h-1v3a1 1 0 0 1-2 0V8a1 1 0 0 1 1-1M16 5a2 2 0 0 1 2 2v10a2 2 0 1 1-4 0v-4h-4v4a2 2 0 1 1-4 0V7a2 2 0 1 1 4 0v4h4V7a2 2 0 0 1 2-2" />
  </Svg>
);

export const Home = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-home ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="m12.707 2.293 9 9c.63.63.184 1.707-.707 1.707h-1v6a3 3 0 0 1-3 3h-1v-7a3 3 0 0 0-2.824-2.995L13 12h-2a3 3 0 0 0-3 3v7H7a3 3 0 0 1-3-3v-6H3c-.89 0-1.337-1.077-.707-1.707l9-9a1 1 0 0 1 1.414 0M13 14a1 1 0 0 1 1 1v7h-4v-7a1 1 0 0 1 .883-.993L11 14z" />
  </Svg>
);

export const Logs = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-logs ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M4 12h.01M4 6h.01M4 18h.01M8 18h2M8 12h2M8 6h2M14 6h6M14 12h6M14 18h6" />
  </Svg>
);

export const Mail = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-mail ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="M22 7.535V17a3 3 0 0 1-2.824 2.995L19 20H5a3 3 0 0 1-2.995-2.824L2 17V7.535l9.445 6.297.116.066a1 1 0 0 0 .878 0l.116-.066L22 7.535z" />
    <Path d="M19 4c1.08 0 2.027.57 2.555 1.427L12 11.797l-9.555-6.37a2.999 2.999 0 0 1 2.354-1.42L5 4h14z" />
  </Svg>
);

export const ArrowRight = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-arrow-narrow-right ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M5 12h14M15 16l4-4M15 8l4 4" />
  </Svg>
);

export const CheckMail = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-mail-check ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M11 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
    <Path d="m3 7 9 6 9-6M15 19l2 2 4-4" />
  </Svg>
);

export const Polaroid = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-polaroid ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6M4 16h16" />
    <Path d="m4 12 3-3c.928-.893 2.072-.893 3 0l4 4" />
    <Path d="m13 12 2-2c.928-.893 2.072-.893 3 0l2 2M14 7h.01" />
  </Svg>
);

export const Phone = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-phone ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="M9 3a1 1 0 0 1 .877.519l.051.11 2 5a1 1 0 0 1-.313 1.16l-.1.068-1.674 1.004.063.103a10 10 0 0 0 3.132 3.132l.102.062 1.005-1.672a1 1 0 0 1 1.113-.453l.115.039 5 2a1 1 0 0 1 .622.807L21 15v4c0 1.657-1.343 3-3.06 2.998C9.361 21.477 2.522 14.638 2 6a3 3 0 0 1 2.824-2.995L5 3h4z" />
  </Svg>
);

export const IdBadge = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler- id-badge-2 ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M7 12h3v4H7v-4" />
    <Path d="M10 6H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-6" />
    <Path d="M10 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4M14 16h2M14 12h4" />
  </Svg>
);

export const MapPin = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-map-pin ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="M18.364 4.636a9 9 0 0 1 .203 12.519l-.203.21-4.243 4.242a3 3 0 0 1-4.097.135l-.144-.135-4.244-4.243A9 9 0 0 1 18.364 4.636zM12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6" />
  </Svg>
);

export const UserPlus = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-user-plus ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M16 19h6M19 16v6M6 21v-2a4 4 0 0 1 4-4h4" />
  </Svg>
);

export const Calendar = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-calendar-week ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="M16 2c.183 0 .355.05.502.135l.033.02c.28.177.465.49.465.845v1h1a3 3 0 0 1 2.995 2.824L21 7v12a3 3 0 0 1-2.824 2.995L18 22H6a3 3 0 0 1-2.995-2.824L3 19V7a3 3 0 0 1 2.824-2.995L6 4h1V3a1 1 0 0 1 .514-.874l.093-.046.066-.025.1-.029.107-.019L8 2q.083 0 .161.013l.122.029.04.012.06.023c.328.135.568.44.61.806L9 3v1h6V3a1 1 0 0 1 1-1m3 7H5v9.625c0 .705.386 1.286.883 1.366L6 20h12c.513 0 .936-.53.993-1.215l.007-.16z" />
    <Path d="M9.015 13a1 1 0 0 1-1 1 1.001 1.001 0 1 1-.005-2c.557 0 1.005.448 1.005 1M13.015 13a1 1 0 0 1-1 1 1.001 1.001 0 1 1-.005-2c.557 0 1.005.448 1.005 1M17.02 13a1 1 0 0 1-1 1 1.001 1.001 0 1 1-.005-2c.557 0 1.005.448 1.005 1M12.02 15a1 1 0 0 1 0 2 1.001 1.001 0 1 1-.005-2zM9.015 16a1 1 0 0 1-1 1 1.001 1.001 0 1 1-.005-2c.557 0 1.005.448 1.005 1" />
  </Svg>
);

export const Clock = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-clock ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
    <Path d="M12 7v5l3 3" />
  </Svg>
);

export const Movie = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-movie ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6M8 4v16M16 4v16M4 8h4M4 16h4M4 12h16M16 8h4M16 16h4" />
  </Svg>
);

export const Upload = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-upload ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v12" />
  </Svg>
);

export const Youtube = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-brand-youtube ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="M18 3a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zM9 9v6a1 1 0 0 0 1.514.857l5-3a1 1 0 0 0 0-1.714l-5-3A1 1 0 0 0 9 9z" />
  </Svg>
);

export const Trash = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-trash ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
  </Svg>
);

export const Pencil = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`icon icon-tabler icons-tabler-filled icon-tabler-pencil ${className}`}
    {...props}
  >
    <Path fill="none" d="M0 0h24v24H0z" />
    <Path d="m12.085 6.5 5.415 5.415-8.793 8.792A1 1 0 0 1 8 21H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 .293-.707zm5.406-2.698a3.828 3.828 0 0 1 1.716 6.405l-.292.293L13.5 5.085l.293-.292a3.83 3.83 0 0 1 3.698-.991" />
  </Svg>
);

export const X = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-x ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

export const Play = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-player-play ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M7 4v16l13-8L7 4" />
  </Svg>
);

export const Photo = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-photo ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M15 8h.01" />
    <Path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z" />
    <Path d="m3 16 5-5c.928-.893 2.072-.893 3 0l5 5" />
    <Path d="m14 14 1-1c.928-.893 2.072-.893 3 0l3 3" />
  </Svg>
);

export const ListDetails = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-list-details ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M13 5h8M13 9h5M13 15h8M13 19h5" />
    <Path d="M3 4m0 1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <Path d="M3 14m0 1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
  </Svg>
);

export const SwitchHorizontal = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-switch-horizontal ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M16 3l4 4-4 4M10 7h10M8 13l-4 4 4 4M4 17h10" />
  </Svg>
);

export const Link = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-link ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M9 15l6-6" />
    <Path d="M11 6l.463-.536a5 5 0 0 1 7.071 7.072L18 13" />
    <Path d="M13 18l-.397.534a5.068 5.068 0 0 1-7.127 0 4.972 4.972 0 0 1 0-7.071L6 11" />
  </Svg>
);

export const Plus = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-plus ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M12 5l0 14M5 12l14 0" />
  </Svg>
);

export const ShieldHalf = ({ size = 24, className, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className={`icon icon-tabler icons-tabler-outline icon-tabler-shield-half ${className}`}
    {...props}
  >
    <Path stroke="none" d="M0 0h24v24H0z" />
    <Path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3M12 3v18" />
  </Svg>
)
