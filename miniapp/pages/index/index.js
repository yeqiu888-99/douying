const urgencyOptions = [
  { label: '48h', hours: 48, price: 100 },
  { label: '24h', hours: 24, price: 150 },
  { label: '12h', hours: 12, price: 200 },
  { label: '10h', hours: 10, price: 300 },
  { label: '8h', hours: 8, price: 400 },
  { label: '5h', hours: 5, price: 600 },
  { label: '3h', hours: 3, price: 800 },
];

Page({
  data: {
    phoneNumber: '',
    serviceTerms: '',
    urgencyOptions,
    selectedUrgencyIndex: 0,
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

  onUrgencySelect(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ selectedUrgencyIndex: index });
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
    const selected = urgencyOptions[this.data.selectedUrgencyIndex];
    try {
      const res = await tt.request({
        url: `${app.globalData.apiBase}/orders/create`,
        method: 'POST',
        data: {
          ...this.data.form,
          reply_limit_minutes: selected.hours * 60,
          douyin_openid: 'mock-openid',
        },
      });
      if (res.statusCode === 200) {
        const payParams = res.data.payParams;
        tt.showLoading({ title: '拉起支付...' });
        tt.requestPayment({
          ...payParams,
          success: () => {
            tt.hideLoading();
            tt.navigateTo({
              url: `/pages/success/success?orderNo=${res.data.orderNo}&expire=${selected.hours}`,
            });
          },
          fail: () => {
            tt.hideLoading();
            tt.showToast({ title: '支付未完成', icon: 'none' });
          },
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
  },
});
