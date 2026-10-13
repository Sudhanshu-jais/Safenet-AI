"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
function authMiddleware(req, res, next) {
    const roleHeader = req.headers['x-user-role'];
    const idHeader = req.headers['x-user-id'];
    let role = 'ADMINISTRATOR'; // Default for demo environment if not specified
    if (roleHeader === 'OPERATOR' || roleHeader === 'AUDITOR' || roleHeader === 'ADMINISTRATOR') {
        role = roleHeader;
    }
    req.user = {
        id: idHeader || (role === 'ADMINISTRATOR' ? 'admin-1' : role === 'OPERATOR' ? 'operator-1' : 'auditor-1'),
        name: role === 'ADMINISTRATOR' ? 'Chief Admin' : role === 'OPERATOR' ? 'Duty Operator' : 'Compliance Auditor',
        role,
    };
    next();
}
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Access denied',
                message: `Action requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${req.user?.role || 'UNKNOWN'}`,
            });
            return;
        }
        next();
    };
}
