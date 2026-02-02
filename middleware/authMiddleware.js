const jwt = require('jsonwebtoken');
const { userCollection } = require('../config/db');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });

  jwt.verify(token, process.env.JWT_SECRET_TOKEN, (err, decoded) => {
    if (err) return res.status(403).send({ message: "forbidden access" });    
    req.user = decoded; 
    
    next();
  });
};

const authorize = (roles) => {
  return async (req, res, next) => { 
    const user = await userCollection.findOne({ email: req.user?.email });
    if (!user || !roles.includes(user.role)) {
      return res.status(403).send({ message: "Access forbidden" });
    }
    next();
  };
};

module.exports = { 
  verifyToken, 
  isAdmin: authorize(['admin']), 
  isMod: authorize(['admin', 'moderator']), 
  isStudent: authorize(['student', 'admin', 'moderator']) 
};