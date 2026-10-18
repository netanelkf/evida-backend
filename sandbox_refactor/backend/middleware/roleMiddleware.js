// Role-based access control middleware

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

export function requireCustomer(req, res, next) {
  return requireRole('customer', 'admin')(req, res, next);
}

export function requireCaregiver(req, res, next) {
  return requireRole('caregiver', 'admin')(req, res, next);
}

export function requireOperator(req, res, next) {
  return requireRole('operator', 'admin')(req, res, next);
}

export function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}
