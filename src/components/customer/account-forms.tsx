"use client";

import { useActionState } from "react";

import { changePasswordAction, requestPhoneOtpAction, saveAddressAction, updatePreferencesAction, updateProfileAction, verifyPhoneOtpAction, type AccountState } from "@/features/customer/account/actions";

const initial: AccountState = {};
function Status({ state }: { state: AccountState }) { return state.message ? <p className={`inline-status ${state.ok ? "success" : "error"}`} role="status">{state.message}</p> : null; }

export function ProfileForm({ customer }: { customer: { firstName: string | null; lastName: string | null; locale: string } }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  return <form noValidate action={action} className="account-form"><div className="customer-form-grid"><label>First name<input name="firstName" defaultValue={customer.firstName ?? ""} required/></label><label>Last name<input name="lastName" defaultValue={customer.lastName ?? ""} required/></label></div><label>Preferred language<select name="locale" defaultValue={customer.locale}><option value="EN">English</option><option value="SI">සිංහල</option><option value="TA">தமிழ்</option></select></label><Status state={state}/><button className="button-primary" disabled={pending}>Save profile</button></form>;
}

export function AddressForm({ address }: { address?: { id: string; type: string; label: string | null; recipient: string; phone: string; line1: string; line2: string | null; city: string; district: string | null; province: string | null; postalCode: string | null; isDefault: boolean } }) {
  const [state, action, pending] = useActionState(saveAddressAction, initial);
  return <form noValidate action={action} className="account-form address-form"><input type="hidden" name="id" value={address?.id ?? ""}/><div className="customer-form-grid"><label>Type<select name="type" defaultValue={address?.type ?? "SHIPPING"}><option>SHIPPING</option><option>BILLING</option><option>OTHER</option></select></label><label>Label<input name="label" defaultValue={address?.label ?? ""} placeholder="Home, workshop…"/></label><label>Recipient<input name="recipient" defaultValue={address?.recipient ?? ""} required/></label><label>Phone<input name="phone" defaultValue={address?.phone ?? ""} required/></label></div><label>Address line 1<input name="line1" defaultValue={address?.line1 ?? ""} required/></label><label>Address line 2<input name="line2" defaultValue={address?.line2 ?? ""}/></label><div className="customer-form-grid"><label>City<input name="city" defaultValue={address?.city ?? ""} required/></label><label>District<input name="district" defaultValue={address?.district ?? ""}/></label><label>Province<input name="province" defaultValue={address?.province ?? ""}/></label><label>Postal code<input name="postalCode" defaultValue={address?.postalCode ?? ""}/></label></div><label className="check-row"><input name="isDefault" type="checkbox" defaultChecked={address?.isDefault}/><span>Use as my default for this address type</span></label><Status state={state}/><button className="button-primary" disabled={pending}>{pending ? "Saving…" : address ? "Update address" : "Add address"}</button></form>;
}

export function SecurityForms({ phone }: { phone: string | null }) {
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, initial);
  const [otpState, otpAction, otpPending] = useActionState(requestPhoneOtpAction, initial);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyPhoneOtpAction, initial);
  return <div className="account-form-stack"><form noValidate action={passwordAction} className="account-form"><h2>Change password</h2><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={10} required/></label><Status state={passwordState}/><button className="button-primary" disabled={passwordPending}>Change password</button></form><form noValidate action={otpAction} className="account-form"><h2>Verify mobile number</h2><label>Sri Lankan mobile<input name="phone" type="tel" defaultValue={phone ?? ""} placeholder="077 123 4567" required/></label><Status state={otpState}/>{otpState.code && <p className="dev-code">Development-only code: <strong>{otpState.code}</strong></p>}<button className="button-secondary" disabled={otpPending}>Request code</button></form>{otpState.challengeId && <form noValidate action={verifyAction} className="account-form"><input type="hidden" name="challengeId" value={otpState.challengeId}/><label>Six-digit code<input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required/></label><Status state={verifyState}/><button className="button-primary" disabled={verifyPending}>Verify phone</button></form>}</div>;
}

export function PreferencesForm({ email, sms }: { email: boolean; sms: boolean }) {
  const [state, action, pending] = useActionState(updatePreferencesAction, initial);
  return <form noValidate action={action} className="account-form"><label className="check-row"><input name="emailMarketing" type="checkbox" defaultChecked={email}/><span>Email offers and product updates</span></label><label className="check-row"><input name="smsMarketing" type="checkbox" defaultChecked={sms}/><span>SMS offers and store updates</span></label><Status state={state}/><button className="button-primary" disabled={pending}>Save preferences</button></form>;
}
