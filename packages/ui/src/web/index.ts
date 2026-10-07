// @mytask/ui/web: React DOM components for apps/web and apps/admin (components.md, ADR-001).
export { Alert, CodeInput, Field, RadioGroup, Select, Submit, TextArea } from './form';
export { PriceInput, QuantityInput, RichTextEditor, richTextFromHtml } from './inputs';
export { CompactStepper, Stepper, type StepItem, type StepStatus } from './stepper';
export {
  AccountMenu,
  DashboardLayout,
  EmptyState,
  InfoButton,
  Panel,
  Price,
  ResponsiveTable,
  RoleSwitcher,
  SidebarNav,
  Skeleton,
  StatGrid,
  StatTile,
  type DashboardSide,
  type LinkComponent,
  type SidebarItem,
} from './dashboard';
export {
  Avatar,
  ChipLink,
  Dialog,
  ExpandableText,
  OnlineStatus,
  Pill,
  RatingStars,
  RatingSummary,
  type AvatarImage,
  type RatingBlockData,
} from './profile';
export {
  CategoryAccordion,
  CategoryBar,
  MenuButton,
  NavDrawer,
  SiteIcon,
  type NavNode,
  type SiteIconName,
} from './site';
export {
  Breadcrumb,
  FeaturedPill,
  FreelancerCard,
  GigCard,
  GigGrid,
  pageWindow,
  Pagination,
  type FreelancerCardData,
  type GigCardData,
  type GigCardLabels,
} from './catalog';
export { categoryThemeProps, type CategoryThemeProps } from './category';
export { MOTION_ENTRANCE_SCRIPT, motionEntrance } from './motion';
export { formatMoney } from './money';
export { Carousel } from './carousel';
