const replyOptions = [
  { label: '2小时内', minutes: 120 },
  { label: '4小时内', minutes: 240 },
  { label: '8小时内', minutes: 480 },
  { label: '24小时内', minutes: 1440 },
];

Page({
  data: {
    phoneNumber: '',
    serviceTerms: '',
    replyOptions: replyOptions.map(o => o.label),
    selectedReplyIndex: 0,
    form: { nickname: '', contact: '', question: '' },
    submitting: false,
    showTerms: false,
  },

  onLoad() {
    this.fetchConfig();
  },

  async fetchConfig() {
    try {
      const app = getApp();
      const res = await tt.request({ url: `${app.globalData.apiBase}/config` });
      if (res.statusCode === 200) {
        this.setData({
          phoneNumber: res.data.phone_number,
          serviceTerms: res.data.service_terms,
        });
      }
    } catch (e) {
      console.error('load config error', e);
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onReplyChange(e) {
    this.setData({ selectedReplyIndex: Number(e.detail.value) });
  },

  validateForm() {
    const { nickname, contact, question } = this.data.form;
    if (!nickname.trim()) return '请填写网名';
    if (!contact.trim()) return '请填写联系方式';
    if (!question || question.trim().length < 20) return '咨询问题至少20个字';
    return '';
  },

  async submit() {
    const err = this.validateForm();
    if (err) {
      tt.showToast({ title: err, icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const app = getApp();
    const limit = replyOptions[this.data.selectedReplyIndex].minutes;
    try {
      const res = await tt.request({
        url: `${app.globalData.apiBase}/orders/create`,
        method: 'POST',
        data: {
          ...this.data.form,
          reply_limit_minutes: limit,
          douyin_openid: 'mock-openid'
        }
      });
      if (res.statusCode === 200) {
        const payParams = res.data.payParams;
        // Replace tt.pay here with real Douyin pay invocation.
        tt.showLoading({ title: '拉起支付...' });
        tt.requestPayment({
          ...payParams,
          success: () => {
            tt.hideLoading();
            tt.navigateTo({ url: `/pages/success/success?orderNo=${res.data.orderNo}&expire=${limit}` });
          },
          fail: () => {
            tt.hideLoading();
            tt.showToast({ title: '支付未完成', icon: 'none' });
          }
        });
      } else {
        tt.showToast({ title: '创建订单失败', icon: 'none' });
      }
    } catch (e) {
      console.error('pay error', e);
      tt.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  toggleTerms() {
    this.setData({ showTerms: !this.data.showTerms });
  }
});
