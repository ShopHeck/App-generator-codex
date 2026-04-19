export type ISODateString = string;
export type UUID = string;

export type Platform = "ios" | "android" | "web" | "cross_platform";
export type TargetDevice = "iphone" | "ipad" | "android_phone" | "android_tablet" | "desktop";

export interface AppSpec {
  version: string;
  metadata: AppMetadata;
  product: ProductDefinition;
  theme: Theme;
  navigation: Navigation;
  dataModels: DataModel[];
  screens: Screen[];
  userFlows: UserFlow[];
  integrations: Integration[];
  deployment?: DeploymentConfig;
  featureFlags?: FeatureFlag[];
  analytics?: AnalyticsConfig;
  automation?: AutomationRule[];
  extensions?: Record<string, unknown>;
}

export interface AppMetadata {
  id: UUID;
  appName: string;
  slug: string;
  description?: string;
  platform: Platform;
  targetDevice: TargetDevice;
  locale?: string;
  timezone?: string;
  tenantMode?: "single_tenant" | "multi_tenant";
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  owner?: OwnerInfo;
  tags?: string[];
}

export interface OwnerInfo {
  teamId?: string;
  organizationId?: string;
  contactEmail?: string;
}

export interface ProductDefinition {
  valueProposition: string;
  primaryAudience?: string;
  monetization: MonetizationModel;
  pricing?: PricingPlan[];
  goals?: ProductGoal[];
  constraints?: string[];
}

export interface ProductGoal {
  key: string;
  metric: string;
  target: string;
}

export type MonetizationType =
  | "subscription"
  | "one_time_purchase"
  | "freemium"
  | "ads"
  | "transaction_fee"
  | "lead_generation"
  | "custom";

export interface MonetizationModel {
  type: MonetizationType;
  notes?: string;
  trialDays?: number;
  billingProvider?: "stripe" | "apple_iap" | "google_play_billing" | "custom";
  customTypeName?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "monthly" | "yearly" | "weekly" | "one_time";
  features: string[];
  highlighted?: boolean;
}

export interface Screen {
  id: string;
  name: string;
  route: string;
  path?: string;
  title?: string;
  description?: string;
  type?: "landing" | "auth" | "dashboard" | "settings" | "detail" | "list" | "checkout" | "custom";
  access?: AccessPolicy;
  layout?: LayoutSpec;
  state?: ScreenState;
  dataBindings?: DataBinding[];
  components: Component[];
  events?: EventHandler[];
  seo?: SeoMeta;
  featureFlags?: string[];
  extensions?: Record<string, unknown>;
}

export interface AccessPolicy {
  requiresAuth?: boolean;
  rolesAllowed?: string[];
  redirectIfUnauthorized?: string;
}

export interface LayoutSpec {
  kind: "stack" | "grid" | "tabs" | "split" | "absolute" | "custom";
  spacing?: number;
  padding?: number;
  columns?: number;
  breakpoints?: Record<string, number>;
}

export interface ScreenState {
  loading?: boolean;
  emptyState?: EmptyState;
  errorState?: ErrorState;
}

export interface EmptyState {
  title: string;
  message?: string;
  ctaLabel?: string;
  ctaActionId?: string;
}

export interface ErrorState {
  title: string;
  message: string;
  retryActionId?: string;
}

export interface DataBinding {
  source: string;
  targetPath: string;
  transform?: string;
  fallback?: unknown;
}

export interface EventHandler {
  id: string;
  trigger: string;
  action: EventAction;
  conditions?: Condition[];
}

export type EventAction =
  | { type: "navigate"; destination: string; params?: Record<string, unknown> }
  | { type: "submit"; endpoint: string; method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" }
  | { type: "track"; eventName: string; payload?: Record<string, unknown> }
  | { type: "custom"; name: string; payload?: Record<string, unknown> };

export interface Condition {
  left: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "includes" | "exists";
  right?: unknown;
}

export interface SeoMeta {
  title?: string;
  description?: string;
  openGraphImage?: string;
  noIndex?: boolean;
}

export type Component =
  | BaseComponent<"text"> & TextComponent
  | BaseComponent<"button"> & ButtonComponent
  | BaseComponent<"input"> & InputComponent
  | BaseComponent<"select"> & SelectComponent
  | BaseComponent<"list"> & ListComponent
  | BaseComponent<"image"> & ImageComponent
  | BaseComponent<"card"> & CardComponent
  | BaseComponent<"chart"> & ChartComponent
  | BaseComponent<"modal"> & ModalComponent
  | BaseComponent<"custom"> & CustomComponent;

export interface BaseComponent<TType extends string> {
  id: string;
  type: TType;
  name?: string;
  visible?: boolean;
  testId?: string;
  style?: StyleTokenRef;
  layout?: Partial<LayoutSpec>;
  bindings?: DataBinding[];
  events?: EventHandler[];
  accessibility?: AccessibilityMeta;
  featureFlags?: string[];
  extensions?: Record<string, unknown>;
}

export interface TextComponent {
  text: string;
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  maxLines?: number;
}

export interface ButtonComponent {
  label: string;
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "link";
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
}

export interface InputComponent {
  inputType?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  validation?: ValidationRule[];
}

export interface SelectComponent {
  name: string;
  label?: string;
  options: SelectOption[];
  multiple?: boolean;
  required?: boolean;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface ListComponent {
  dataSource: string;
  itemComponent: Component;
  emptyState?: EmptyState;
  pagination?: PaginationConfig;
}

export interface PaginationConfig {
  mode: "infinite" | "page" | "cursor";
  pageSize?: number;
  cursorField?: string;
}

export interface ImageComponent {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  objectFit?: "cover" | "contain" | "fill";
  lazy?: boolean;
}

export interface CardComponent {
  title?: string;
  subtitle?: string;
  content?: string;
  media?: ImageComponent;
  actions?: Component[];
}

export interface ChartComponent {
  chartType: "line" | "bar" | "pie" | "area" | "funnel";
  dataSource: string;
  xKey?: string;
  yKeys?: string[];
}

export interface ModalComponent {
  title: string;
  content: Component[];
  closeOnBackdrop?: boolean;
}

export interface CustomComponent {
  registryKey: string;
  props?: Record<string, unknown>;
}

export interface AccessibilityMeta {
  label?: string;
  hint?: string;
  role?: string;
  tabIndex?: number;
}

export interface StyleTokenRef {
  color?: string;
  backgroundColor?: string;
  typography?: string;
  spacing?: string;
  radius?: string;
  shadow?: string;
}

export interface Navigation {
  type: "stack" | "tab" | "drawer" | "split" | "router";
  initialRoute: string;
  routes: NavigationRoute[];
  guards?: NavigationGuard[];
  deeplinks?: DeepLinkConfig[];
  transitions?: TransitionSpec[];
}

export interface NavigationRoute {
  name: string;
  path: string;
  screenId: string;
  icon?: string;
  children?: NavigationRoute[];
  paramsSchema?: Record<string, ParamType>;
}

export type ParamType = "string" | "number" | "boolean" | "date" | "json";

export interface NavigationGuard {
  id: string;
  when: string;
  redirectTo: string;
  reason?: string;
}

export interface DeepLinkConfig {
  scheme: string;
  host?: string;
  pathPrefix?: string;
}

export interface TransitionSpec {
  from: string;
  to: string;
  animation?: "default" | "slide" | "fade" | "none";
}

export interface DataModel {
  id: string;
  name: string;
  description?: string;
  source: DataSource;
  fields: DataField[];
  relationships?: DataRelationship[];
  indexes?: DataIndex[];
  policies?: DataPolicy[];
  lifecycle?: DataLifecycle;
  extensions?: Record<string, unknown>;
}

export type DataSource =
  | { type: "local"; storage: "memory" | "sqlite" | "indexeddb" }
  | { type: "supabase"; table: string; schema?: string }
  | { type: "firebase"; collection: string }
  | { type: "rest_api"; endpoint: string; method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" }
  | { type: "custom"; key: string; config?: Record<string, unknown> };

export interface DataField {
  name: string;
  type: DataFieldType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  validation?: ValidationRule[];
  pii?: boolean;
}

export type DataFieldType =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "enum"
  | "json"
  | "uuid"
  | "url"
  | "email"
  | "currency";

export interface ValidationRule {
  type:
    | "min"
    | "max"
    | "length"
    | "regex"
    | "email"
    | "url"
    | "custom"
    | "required"
    | "one_of";
  value?: number | string | string[];
  message?: string;
}

export interface DataRelationship {
  type: "one_to_one" | "one_to_many" | "many_to_many";
  targetModel: string;
  foreignKey?: string;
  through?: string;
}

export interface DataIndex {
  fields: string[];
  unique?: boolean;
  name?: string;
}

export interface DataPolicy {
  action: "create" | "read" | "update" | "delete" | "list";
  condition?: string;
  roles?: string[];
}

export interface DataLifecycle {
  softDelete?: boolean;
  ttlSeconds?: number;
  audit?: boolean;
}

export interface UserFlow {
  id: string;
  name: string;
  description?: string;
  trigger: FlowTrigger;
  steps: FlowStep[];
  conversionGoal?: string;
  kpis?: string[];
  automation?: FlowAutomation;
  extensions?: Record<string, unknown>;
}

export type FlowTrigger =
  | { type: "app_open" }
  | { type: "screen_view"; screenId: string }
  | { type: "event"; eventName: string }
  | { type: "schedule"; cron: string }
  | { type: "webhook"; endpoint: string };

export interface FlowStep {
  id: string;
  type: "navigate" | "show_component" | "hide_component" | "mutate_data" | "call_api" | "wait" | "track" | "custom";
  config: Record<string, unknown>;
  conditions?: Condition[];
  onFailure?: FlowFailure;
}

export interface FlowFailure {
  retry?: RetryPolicy;
  fallbackStepId?: string;
  errorMessage?: string;
}

export interface RetryPolicy {
  attempts: number;
  backoffMs?: number;
  strategy?: "fixed" | "linear" | "exponential";
}

export interface FlowAutomation {
  enabled: boolean;
  webhookUrl?: string;
  runAsynchronously?: boolean;
}

export interface Theme {
  mode: "light" | "dark" | "system";
  tokens: ThemeTokens;
  typography: TypographySystem;
  spacing: SpacingScale;
  radius?: RadiusScale;
  shadows?: ShadowScale;
  componentThemes?: Record<string, Record<string, unknown>>;
  customCssVariables?: Record<string, string>;
}

export interface ThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface?: string;
  textPrimary?: string;
  textSecondary?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

export interface TypographySystem {
  fontFamily: string;
  baseSize: number;
  scale?: Record<string, TypographyToken>;
}

export interface TypographyToken {
  fontSize: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
}

export type SpacingScale = Record<string, number>;
export type RadiusScale = Record<string, number>;

export interface ShadowScale {
  [token: string]: {
    x: number;
    y: number;
    blur: number;
    spread?: number;
    color: string;
  };
}

export type Integration =
  | RestApiIntegration
  | SupabaseIntegration
  | FirebaseIntegration
  | StripeIntegration
  | WebhookIntegration
  | AnalyticsIntegration
  | CustomIntegration;

interface IntegrationBase<TType extends string> {
  id: string;
  type: TType;
  enabled: boolean;
  name?: string;
  environment?: "development" | "staging" | "production";
  configVersion?: string;
  extensions?: Record<string, unknown>;
}

export interface RestApiIntegration extends IntegrationBase<"rest_api"> {
  baseUrl: string;
  auth?: AuthConfig;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface SupabaseIntegration extends IntegrationBase<"supabase"> {
  projectUrl: string;
  anonKeyRef: string;
  schema?: string;
  realtime?: boolean;
}

export interface FirebaseIntegration extends IntegrationBase<"firebase"> {
  projectId: string;
  appId?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface StripeIntegration extends IntegrationBase<"stripe"> {
  publishableKeyRef: string;
  webhookSigningSecretRef?: string;
  products?: StripeProduct[];
}

export interface StripeProduct {
  id: string;
  name: string;
  priceId: string;
  trialDays?: number;
}

export interface WebhookIntegration extends IntegrationBase<"webhook"> {
  events: string[];
  targetUrl: string;
  signingSecretRef?: string;
}

export interface AnalyticsIntegration extends IntegrationBase<"analytics"> {
  provider: "segment" | "mixpanel" | "amplitude" | "posthog" | "custom";
  apiKeyRef: string;
  trackScreenViews?: boolean;
}

export interface CustomIntegration extends IntegrationBase<"custom"> {
  providerKey: string;
  config: Record<string, unknown>;
}

export interface AuthConfig {
  type: "none" | "bearer" | "basic" | "oauth2" | "api_key";
  credentialsRef?: string;
  location?: "header" | "query";
  headerName?: string;
}

export interface DeploymentConfig {
  target: "xcode" | "testflight" | "app_store" | "web" | "play_store" | "custom";
  bundleId?: string;
  minimumIOSVersion?: string;
  minimumAndroidSdk?: number;
  envVars?: Record<string, string>;
}

export interface FeatureFlag {
  key: string;
  description?: string;
  defaultValue: boolean;
  rolloutPercentage?: number;
}

export interface AnalyticsConfig {
  events: AnalyticsEvent[];
  funnels?: AnalyticsFunnel[];
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, ParamType>;
}

export interface AnalyticsFunnel {
  name: string;
  steps: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: FlowTrigger;
  action: EventAction;
  enabled: boolean;
}
