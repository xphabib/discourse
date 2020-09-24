# frozen_string_literal: true

module Jobs

  class EnsureS3UploadsExistence < ::Jobs::Scheduled
    every 1.day

    WAIT_AFTER_RESTORE_HOURS = 48

    def perform(*args)
      super
    ensure
      if @db_inventories
        @db_inventories.values.each { |f| f.close; f.unlink }
      end
    end

    def s3_helper
      Discourse.store.s3_helper
    end

    def prepare_for_all_sites
      inventory = S3Inventory.new(s3_helper, :upload)
      @db_inventories = inventory.prepare_for_all_sites
      @inventory_date = inventory.inventory_date
    end

    def execute(args)
      return if !executable?
      require 's3_inventory'

      if !@db_inventories && Rails.configuration.multisite && GlobalSetting.use_s3?
        prepare_for_all_sites
      end

      if @db_inventories && preloaded_inventory_file = @db_inventories[RailsMultisite::ConnectionManagement.current_db]
        S3Inventory.new(
          s3_helper,
          :upload,
          preloaded_inventory_file: preloaded_inventory_file,
          preloaded_inventory_date: @inventory_date
        ).backfill_etags_and_list_missing
      else
        S3Inventory.new(s3_helper, :upload).backfill_etags_and_list_missing
      end
    end

    def executable?
      return false if !SiteSetting.enable_s3_inventory

      if last_restore_date = BackupMetadata.last_restore_date
        return false if last_restore_date > WAIT_AFTER_RESTORE_HOURS.hours.ago
      end

      true
    end
  end
end
