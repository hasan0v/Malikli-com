# Generated migration for WaitlistSubscriber model changes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_waitlistsubscriber'),  # Correct dependency - must create model first
    ]

    operations = [
        migrations.AddField(
            model_name='waitlistsubscriber',
            name='name',
            field=models.CharField(blank=True, help_text='Full name of the subscriber', max_length=255, verbose_name='name'),
        ),
        migrations.AddField(
            model_name='waitlistsubscriber',
            name='source',
            field=models.CharField(choices=[('website', 'Website'), ('social_media', 'Social Media'), ('email_campaign', 'Email Campaign'), ('referral', 'Referral'), ('advertisement', 'Advertisement'), ('influencer', 'Influencer'), ('newsletter', 'Newsletter'), ('other', 'Other')], default='website', help_text='How the subscriber found us', max_length=50, verbose_name='source'),
        ),
        migrations.AlterField(
            model_name='waitlistsubscriber',
            name='first_name',
            field=models.CharField(blank=True, help_text='Extracted from name field', max_length=150, verbose_name='first name'),
        ),
        migrations.AlterField(
            model_name='waitlistsubscriber',
            name='last_name',
            field=models.CharField(blank=True, help_text='Extracted from name field', max_length=150, null=True, verbose_name='last name'),
        ),
    ]
