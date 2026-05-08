class ApiResponse {
  constructor(data = null, message = 'Success', meta = {}) {
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
  success = true;
}

export { ApiResponse };
