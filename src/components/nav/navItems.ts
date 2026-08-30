import {
  Home,
  BookOpenCheck,
  Dumbbell,
  ClipboardCheck,
  LineChart,
  AlertTriangle,
  Library,
  MessageCircleQuestion,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  primary: boolean; // shown in mobile bottom nav directly vs under "More"
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home, primary: true },
  { href: "/study", label: "Study", icon: BookOpenCheck, primary: true },
  { href: "/practice", label: "Practice", icon: Dumbbell, primary: true },
  { href: "/progress", label: "Progress", icon: LineChart, primary: true },
  { href: "/mock", label: "Mock Exam", icon: ClipboardCheck, primary: false },
  { href: "/errors", label: "Errors", icon: AlertTriangle, primary: false },
  { href: "/vocabulary", label: "Vocabulary", icon: Library, primary: false },
  { href: "/tutor", label: "AI Tutor", icon: MessageCircleQuestion, primary: false },
  { href: "/profile", label: "Profile", icon: UserRound, primary: false },
];
