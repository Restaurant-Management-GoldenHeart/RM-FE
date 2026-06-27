/**
 * AccountProfilePage.jsx
 * Trang chỉnh sửa hồ sơ cá nhân — tên, SĐT, địa chỉ, ngày sinh, giới tính.
 * Dùng react-hook-form + react-query mutation để cập nhật.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerPortalApi } from '../../api/customerPortalApi';
import TierBadge from '../../components/account/TierBadge';

const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');

export default function AccountProfilePage() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => customerPortalApi.getProfile().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({ defaultValues: { name: '', phone: '', address: '', dateOfBirth: '', gender: '' } });

  // Đổ dữ liệu vào form khi profile tải xong
  useEffect(() => {
    if (!profile) return;
    reset({
      name:        profile.name        ?? '',
      phone:       profile.phone       ?? '',
      address:     profile.address     ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      gender:      profile.gender      ?? '',
    });
  }, [profile, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => customerPortalApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Cập nhật hồ sơ thành công!');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Cập nhật thất bại.';
      toast.error(msg);
    },
  });

  const onSubmit = (values) => {
    // Chỉ gửi những field có giá trị; dateOfBirth để trống thì gửi null
    mutate({
      name:        values.name        || undefined,
      phone:       values.phone       || undefined,
      address:     values.address     || undefined,
      dateOfBirth: values.dateOfBirth || null,
      gender:      values.gender      || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#ca8a04]/30 border-t-[#ca8a04] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-2xl text-[#f5f0e8] mb-1">
          Hồ sơ cá nhân
        </h1>
        <p className="text-[#6a6560] text-sm">Quản lý thông tin tài khoản của bạn.</p>
      </div>

      {/* Thẻ tóm tắt */}
      <div className="bg-[#0f0e0b] border border-[#ca8a04]/15 rounded-2xl p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#ca8a04]/10 border border-[#ca8a04]/25 flex items-center justify-center flex-shrink-0">
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-[#ca8a04] font-bold text-2xl leading-none">
            {profile?.name?.[0]?.toUpperCase() ?? <User size={24} />}
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-[#f5f0e8] font-semibold text-base">{profile?.name ?? '—'}</div>
          <div className="text-[#6a6560] text-sm truncate">{profile?.email}</div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {profile?.tierName && <TierBadge tierCode={profile.tierCode} tierName={profile.tierName} size="sm" />}
            <span className="text-[#6a6560] text-xs">{fmtNum(profile?.loyaltyPoints)} điểm</span>
          </div>
        </div>
      </div>

      {/* Form chỉnh sửa */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-2xl p-6 space-y-5">
          <h2 className="text-[#f5f0e8] text-sm font-semibold mb-1">Thông tin cá nhân</h2>

          {/* Họ và tên */}
          <div>
            <label className="block text-[#8a8480] text-xs mb-1.5">Họ và tên</label>
            <input
              {...register('name', { required: 'Vui lòng nhập họ tên' })}
              className="w-full bg-[#0a0906] border border-[#ca8a04]/15 rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#3a3730] focus:outline-none focus:border-[#ca8a04]/50 transition-colors"
              placeholder="Nguyễn Văn A"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Email (chỉ đọc) */}
          <div>
            <label className="block text-[#8a8480] text-xs mb-1.5">Email</label>
            <input
              readOnly
              value={profile?.email ?? ''}
              className="w-full bg-[#0a0906] border border-[#ca8a04]/8 rounded-xl px-4 py-2.5 text-sm text-[#4a4a46] cursor-not-allowed"
            />
            <p className="text-[#3a3730] text-[11px] mt-1">Email không thể thay đổi.</p>
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-[#8a8480] text-xs mb-1.5">Số điện thoại</label>
            <input
              {...register('phone', {
                pattern: { value: /^(0|\+84)[0-9]{9}$/, message: 'SĐT không hợp lệ (VD: 0901234567)' },
              })}
              className="w-full bg-[#0a0906] border border-[#ca8a04]/15 rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#3a3730] focus:outline-none focus:border-[#ca8a04]/50 transition-colors"
              placeholder="0901234567"
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block text-[#8a8480] text-xs mb-1.5">Địa chỉ</label>
            <input
              {...register('address')}
              className="w-full bg-[#0a0906] border border-[#ca8a04]/15 rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#3a3730] focus:outline-none focus:border-[#ca8a04]/50 transition-colors"
              placeholder="123 Đường ABC, Quận 1, TP.HCM"
            />
          </div>

          {/* Ngày sinh + Giới tính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[#8a8480] text-xs mb-1.5">Ngày sinh</label>
              <input
                type="date"
                {...register('dateOfBirth')}
                className="w-full bg-[#0a0906] border border-[#ca8a04]/15 rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-[#ca8a04]/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-[#8a8480] text-xs mb-1.5">Giới tính</label>
              <select
                {...register('gender')}
                className="w-full bg-[#0a0906] border border-[#ca8a04]/15 rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-[#ca8a04]/50 transition-colors"
              >
                <option value="">Chọn giới tính</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>
        </div>

        {/* Nút lưu */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || !isDirty}
            className="px-8 py-2.5 rounded-xl bg-[#ca8a04] text-[#0a0906] font-semibold text-sm hover:bg-[#b07d04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
