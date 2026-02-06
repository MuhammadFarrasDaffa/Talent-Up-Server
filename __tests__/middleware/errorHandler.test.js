const errorHandler = require("../../middleware/ErrorHandler");

describe("Error Handler Middleware", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("ValidationError", () => {
    it("should return 400 for ValidationError", () => {
      const error = {
        name: "ValidationError",
        message: "Validation failed",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Validation failed",
      });
    });

    it("should handle custom validation message", () => {
      const error = {
        name: "ValidationError",
        message: "Email is required",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email is required",
      });
    });
  });

  describe("Unauthorized", () => {
    it("should return 401 for Unauthorized error", () => {
      const error = {
        name: "Unauthorized",
        message: "Please login first",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Please login first",
      });
    });

    it("should use default message for Unauthorized without message", () => {
      const error = {
        name: "Unauthorized",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });
  });

  describe("JsonWebTokenError", () => {
    it("should return 401 for JsonWebTokenError", () => {
      const error = {
        name: "JsonWebTokenError",
        message: "jwt malformed",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "jwt malformed" });
    });

    it("should handle JWT invalid signature", () => {
      const error = {
        name: "JsonWebTokenError",
        message: "invalid signature",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe("Forbidden", () => {
    it("should return 403 for Forbidden error", () => {
      const error = {
        name: "Forbidden",
        message: "Access denied",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Access denied" });
    });

    it("should use default message for Forbidden without message", () => {
      const error = {
        name: "Forbidden",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Forbidden" });
    });
  });

  describe("NotFound", () => {
    it("should return 404 for NotFound error", () => {
      const error = {
        name: "NotFound",
        message: "Resource not found",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Resource not found",
      });
    });

    it("should use default message for NotFound without message", () => {
      const error = {
        name: "NotFound",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not Found" });
    });
  });

  describe("Internal Server Error", () => {
    it("should return 500 for unknown errors", () => {
      const error = {
        name: "UnknownError",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Internal Server Error",
      });
    });

    it("should use error message if provided for unknown errors", () => {
      const error = {
        name: "SomeError",
        message: "Something went wrong",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });

    it("should handle error without name", () => {
      const error = {
        message: "Generic error",
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Generic error" });
    });

    it("should handle empty error object", () => {
      const error = {};

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Internal Server Error",
      });
    });
  });
});
