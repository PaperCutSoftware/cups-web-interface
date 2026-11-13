export interface Printer {
  name: string;
  uri: string;
  info: string;
  location: string;
  state: 'idle' | 'printing' | 'stopped' | 'error' | string;
  state_message: string;
  is_default: boolean;
  is_shared: boolean;
  is_class: boolean;
  accepting_jobs: boolean;
  queued_jobs_count: number;
  alerts?: string[];
  arch_readiness?: ArchReadiness;
  diagnostic?: DiagnosticInfo;
}

export interface DiagnosticInfo {
  code: string;
  title: string;
  explanation: string;
  remedies: string[];
  severity: 'error' | 'warning' | 'info';
}

export interface LogEntry {
  timestamp: string;
  raw_date: string;
  level: 'error' | 'warn' | 'info' | 'debug' | string;
  message: string;
  printer?: string;
  job_id?: string;
  diagnostic?: DiagnosticInfo;
}

export interface LaunchAgentStatus {
  supported: boolean;
  installed: boolean;
  running: boolean;
  plist_path: string;
  executable: string;
  status_detail: string;
}

export interface ArchReadiness {
  status: 'universal' | 'native_arm64' | 'rosetta_dependent' | 'driverless' | 'missing_binary' | string;
  label: string;
  driver_model?: string;
  ppd_path?: string;
  rosetta_required: boolean;
  binary_count: number;
}

export interface Job {
  id: string;
  printer: string;
  title: string;
  user: string;
  state: 'pending' | 'processing' | 'held' | 'completed' | 'cancelled' | string;
  state_reason?: string;
  size_bytes: number;
  submitted_at: string;
  raw_date: string;
  is_stuck: boolean;
  diagnostic?: DiagnosticInfo;
}

export interface SystemStatus {
  daemon_running: boolean;
  cups_version: string;
  web_interface_enabled: boolean;
  default_printer: string;
  server_time: string;
  printers_count: number;
  active_jobs_count: number;
  server_address: string;
}

export interface OptionChoice {
  name: string;
  label: string;
  is_default: boolean;
}

export interface PrinterOption {
  key: string;
  display_name: string;
  default_value: string;
  current_value: string;
  choices: OptionChoice[];
  group: 'general' | 'accessories' | string;
}

export interface PrinterOptionsResponse {
  printer_name: string;
  general: PrinterOption[];
  accessories: PrinterOption[];
}

export interface BinaryInfo {
  path: string;
  name: string;
  type: string;
  exists: boolean;
  size_bytes: number;
  slices: string[];
  is_universal: boolean;
  is_native_apple: boolean;
  rosetta_required: boolean;
  recommendation: string;
}

export interface ArchAuditResult {
  printer_name: string;
  ppd_path: string;
  driver_model: string;
  status: 'universal' | 'native_arm64' | 'rosetta_dependent' | 'driverless' | 'missing_binary' | string;
  label: string;
  rosetta_required: boolean;
  binaries: BinaryInfo[];
  migration_advice: string;
}

export interface FleetAuditSummary {
  total_queues: number;
  universal_queues: number;
  rosetta_queues: number;
  driverless_queues: number;
  broken_queues: number;
}

export interface AddPrinterParams {
  name: string;
  description: string;
  uri: string;
  location?: string;
  shared?: boolean;
  make?: string;
  model?: string;
  ppd_path?: string;
}

export interface ModifyPrinterParams {
  description: string;
  uri: string;
  location?: string;
  shared?: boolean;
}

export interface DriverInfo {
  name: string;
  make: string;
  model: string;
  arch_readiness: ArchReadiness;
}

export interface PPDValidationResult {
  valid: boolean;
  model: string;
  warnings: string[];
  errors: string[];
}

export interface ServerSettings {
  share_printers: boolean;
  remote_printers: boolean;
  debug_logging: boolean;
}

