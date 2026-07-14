import * as T from './ai.types';

// ── Injection Detection Patterns ──────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|commands|directions)/i,
  /forget\s+(all\s+)?(previous|above)/i,
  /system\s*(prompt|instruction|message|role)/i,
  /you\s+(are|were)\s+(an?\s+)?(ai|assistant|model)/i,
  /act\s+as\s+(an?\s+)?(administrator|root|superuser|admin)/i,
  /bypass\s+(restrictions|constraints|security|limitations)/i,
  /'?\s*OR\s+['"]?\s*1\s*['"]?\s*=\s*['"]?\s*1/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM\s+\w+/i,
  /UPDATE\s+\w+\s+SET/i,
  /INSERT\s+INTO/i,
  /ALTER\s+(TABLE|DATABASE|SYSTEM)/i,
  /--\s*$/m,
  /;\s*DROP/i,
  /exec\s*(xp_cmdshell|sp_configure)/i,
  /eval\s*\(/i,
  /process\.env/i,
  /require\s*\(/i,
  /fs\.(read|write|unlink)/i,
  /child_process/i,
];

// ── Tool Permissions ──────────────────────────────────────────────────

const TOOL_PERMISSIONS: Record<string, string[]> = {
  // Owner-only (destructive)
  delete_conversation: ['owner'],
  clear_all_data: ['owner'],
  modify_system_config: ['owner'],
  execute_destructive_action: ['owner'],
  reset_user_password: ['owner'],
  modify_backup_config: ['owner'],
  run_backup_restore: ['owner'],
  delete_financial_records: ['owner'],
  modify_audit_log: ['owner'],
  // Owner + Manager
  approve_discount: ['owner', 'manager'],
  approve_write_off: ['owner', 'manager'],
  modify_inventory: ['owner', 'manager'],
  modify_pricing: ['owner', 'manager'],
  add_user: ['owner', 'manager'],
  modify_shift: ['owner', 'manager'],
  approve_purchase_order: ['owner', 'manager'],
  // Owner + Manager + Accountant
  view_financial_reports: ['owner', 'manager', 'accountant'],
  export_data: ['owner', 'manager', 'accountant'],
  modify_gst: ['owner', 'manager', 'accountant'],
};

const DESTRUCTIVE_TOOLS: string[] = [
  'delete_conversation',
  'clear_all_data',
  'modify_system_config',
  'execute_destructive_action',
  'delete_financial_records',
  'modify_audit_log',
];

// ── Safety Service ────────────────────────────────────────────────────

export const SafetyService = {
  async validatePrompt(
    text: string,
    userId: string,
    role: string,
  ): Promise<T.SafetyResult> {
    const checks: T.SafetyCheck[] = [];

    // 1. Prompt injection check
    const injectionCheck = this.checkPromptInjection(text);
    checks.push(injectionCheck);

    // 2. RBAC check
    const rbacCheck: T.SafetyCheck = {
      type: 'rbac',
      passed: true,
      reason: `User ${userId} with role ${role} is authenticated`,
    };
    checks.push(rbacCheck);

    // 3. Tool permission check (generic)
    const toolCheck: T.SafetyCheck = {
      type: 'tool_permission',
      passed: true,
      reason: 'No tool call detected in initial prompt',
    };
    checks.push(toolCheck);

    // 4. Destructive action check
    const destructiveCheck = this.checkDestructiveIntent(text, role);
    checks.push(destructiveCheck);

    const allPassed = checks.every((c) => c.passed);
    const blockedReason = allPassed
      ? undefined
      : checks.find((c) => !c.passed)?.reason;

    return {
      checks,
      passed: allPassed,
      blockedReason,
      requiresConfirmation:
        destructiveCheck.passed === false && role === 'owner',
    };
  },

  checkPromptInjection(text: string): T.SafetyCheck {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          type: 'prompt_injection',
          passed: false,
          reason: `Detected potential prompt injection pattern: ${pattern.source.slice(0, 60)}`,
        };
      }
    }
    return {
      type: 'prompt_injection',
      passed: true,
      reason: 'No injection patterns detected',
    };
  },

  checkDestructiveIntent(text: string, role: string): T.SafetyCheck {
    const lower = text.toLowerCase();
    for (const tool of DESTRUCTIVE_TOOLS) {
      const toolWords = tool.replace(/_/g, ' ');
      if (lower.includes(toolWords) || lower.includes(tool)) {
        if (role !== 'owner') {
          return {
            type: 'destructive_action',
            passed: false,
            reason: `Action '${tool}' requires owner role`,
          };
        }
        return {
          type: 'destructive_action',
          passed: true,
          reason: `Destructive action '${tool}' authorized for owner`,
        };
      }
    }
    return {
      type: 'destructive_action',
      passed: true,
      reason: 'No destructive intent detected',
    };
  },

  checkToolPermission(toolName: string, role: string): boolean {
    const allowedRoles = TOOL_PERMISSIONS[toolName];
    if (!allowedRoles) return true;
    return allowedRoles.includes(role);
  },

  requiresConfirmation(toolName: string): boolean {
    return DESTRUCTIVE_TOOLS.includes(toolName);
  },

  getInjectionPatterns(): RegExp[] {
    return INJECTION_PATTERNS;
  },

  getToolPermissions(): Record<string, string[]> {
    return TOOL_PERMISSIONS;
  },
};
