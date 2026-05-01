alter table bookings
add column if not exists payment_status text not null default 'unpaid';

update bookings
set payment_status = 'unpaid'
where payment_status is null;
