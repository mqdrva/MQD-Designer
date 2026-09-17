create policy mqd_email_notifications_no_client_access
on public.mqd_email_notifications
for all
to authenticated
using (false)
with check (false);
