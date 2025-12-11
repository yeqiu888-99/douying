Page({
  data: {
    orderNo: '',
    createdAt: '',
    latestReply: ''
  },

  onLoad(query) {
    const now = new Date();
    const expireMinutes = Number(query.expire || 0);
    const latest = new Date(now.getTime() + expireMinutes * 60000);
    this.setData({
      orderNo: query.orderNo,
      createdAt: now.toLocaleString(),
      latestReply: latest.toLocaleString()
    });
  },

  goHome() {
    tt.reLaunch({ url: '/pages/index/index' });
  }
});
