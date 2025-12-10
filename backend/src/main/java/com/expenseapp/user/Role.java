package com.expenseapp.user;

public enum Role {
    EMPLOYEE,     // Level 0 - Can submit expenses, view own data
    MANAGER,      // Level 1 - Can approve expenses, view team data
    ADMIN,        // Level 2 - Can manage users, configure policies
    SUPER_ADMIN,  // Level 3 - Full system access
    USER          // Deprecated - kept for backward compatibility, maps to EMPLOYEE
}
