const User = require("../models/User");

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect("/?error=Please login to continue");
    }
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/?error=Session expired. Please login again");
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).redirect("/?error=Authentication error");
  }
};

module.exports = { requireAuth };

