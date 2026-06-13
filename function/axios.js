const axios = require('axios')

// helper: ดึง status จาก error อย่างปลอดภัย (network error/timeout จะไม่มี error.response)
const errStatus = (error) => (error.response ? error.response.status : (error.code || 'ERR'));

exports.post = async (url, body) => {
  try {
    const res = await axios.post(url, body);
    return res.data;
  } catch (error) {
    const status = errStatus(error);
    console.error(status);
    return status;
  }
};

exports.get = async (url) => {
  try {
    const res = await axios.get(url);
    return res.data;
  } catch (error) {
    const status = errStatus(error);
    console.error(status);
    return status;
  }
};
