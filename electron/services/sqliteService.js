const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  calculateBathroomEstimate,
  buildCustomerEstimateView,
  buildInternalCostView
} = require('./bathroomEstimateService');

function nowIso() {
  return new Date().toISOString();
}

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function fromJson(value, fallback) {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getDatabaseDir(app) {
  if (app && app.isPackaged) {
    return path.join(app.getPath('userData'), 'storage', 'sqlite');
  }

  return path.join(__dirname, '..', '..', 'storage', 'sqlite');
}

function openDatabase(filePath) {
  return new DatabaseSync(filePath);
}

function createSqliteService({ app }) {
  const databaseDir = getDatabaseDir(app);
  fs.mkdirSync(databaseDir, { recursive: true });

  const dbPaths = {
    project: path.join(databaseDir, 'project.db'),
    approval: path.join(databaseDir, 'approval.db'),
    master: path.join(databaseDir, 'master.db'),
    logs: path.join(databaseDir, 'logs.db')
  };

  const db = {
    project: openDatabase(dbPaths.project),
    approval: openDatabase(dbPaths.approval),
    master: openDatabase(dbPaths.master),
    logs: openDatabase(dbPaths.logs)
  };

  const PROFIT_POLICY = {
    minimumBudget: 7000000,
    minimumPricePerM2: 1500000,
    blockMarginRate: 0.25,
    modifyMarginRate: 0.3,
    goMarginRate: 0.35
  };

  function migrate() {
    db.project.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id TEXT PRIMARY KEY,
        project_name_ko TEXT NOT NULL,
        current_process_ko TEXT NOT NULL,
        today_tasks_json TEXT NOT NULL,
        deadline TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        profit_rate TEXT NOT NULL,
        receivable_amount TEXT NOT NULL,
        progress_rate TEXT NOT NULL,
        remaining_days INTEGER NOT NULL,
        receivable_status_ko TEXT NOT NULL,
        defect_risk_ko TEXT NOT NULL,
        next_action_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimates (
        estimate_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        estimate_type TEXT NOT NULL,
        amount_text TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bathroom_estimates (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        site_name TEXT NOT NULL,
        bathroom_count INTEGER NOT NULL,
        bathroom_area_m2 REAL NOT NULL,
        ceiling_height_mm INTEGER NOT NULL,
        construction_method TEXT NOT NULL,
        waterproof_method TEXT NOT NULL,
        tile_wall_type TEXT NOT NULL,
        tile_floor_type TEXT NOT NULL,
        options_json TEXT NOT NULL,
        revenue INTEGER NOT NULL,
        total_cost INTEGER NOT NULL,
        expected_margin INTEGER NOT NULL,
        expected_margin_rate REAL NOT NULL,
        pce_decision TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bathroom_estimate_items (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        category TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        customer_unit_price INTEGER NOT NULL,
        customer_total INTEGER NOT NULL,
        material_cost INTEGER NOT NULL,
        labor_cost INTEGER NOT NULL,
        subcontract_cost INTEGER NOT NULL,
        internal_total INTEGER NOT NULL,
        margin INTEGER NOT NULL,
        margin_rate REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portfolio_projects (
        portfolio_project_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        project_status TEXT NOT NULL,
        revenue_amount INTEGER NOT NULL,
        cost_amount INTEGER NOT NULL,
        expected_margin INTEGER NOT NULL,
        expected_margin_rate REAL NOT NULL,
        risk_level TEXT NOT NULL,
        red_alert_count INTEGER NOT NULL,
        start_date TEXT,
        end_date TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resource_allocations (
        allocation_id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        resource_name_ko TEXT NOT NULL,
        resource_role TEXT NOT NULL,
        project_id TEXT NOT NULL,
        allocation_status TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        allocation_rate REAL NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resource_conflicts (
        conflict_id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        resource_name_ko TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        project_ids_json TEXT NOT NULL,
        conflict_date_range_json TEXT NOT NULL,
        message_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS portfolio_cashflow (
        cashflow_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        cashflow_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        expected_date TEXT NOT NULL,
        actual_date TEXT,
        cashflow_status TEXT NOT NULL,
        source_type TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crew_members (
        crew_member_id TEXT PRIMARY KEY,
        member_name_ko TEXT NOT NULL,
        crew_type TEXT NOT NULL,
        role TEXT NOT NULL,
        daily_wage INTEGER NOT NULL,
        minimum_labor_day REAL NOT NULL,
        productivity_standard_json TEXT NOT NULL,
        current_project_id TEXT,
        availability_json TEXT NOT NULL,
        reliability_score INTEGER NOT NULL,
        defect_history_count INTEGER NOT NULL,
        absence_history_count INTEGER NOT NULL,
        status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crew_skills (
        crew_skill_id TEXT PRIMARY KEY,
        crew_member_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        skill_level TEXT NOT NULL,
        productivity_unit TEXT NOT NULL,
        productivity_value REAL NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crew_allocations (
        crew_allocation_id TEXT PRIMARY KEY,
        crew_member_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        allocation_status TEXT NOT NULL,
        planned_start_date TEXT NOT NULL,
        planned_end_date TEXT NOT NULL,
        actual_start_date TEXT,
        actual_end_date TEXT,
        planned_labor_day REAL NOT NULL,
        actual_labor_day REAL NOT NULL,
        planned_labor_cost INTEGER NOT NULL,
        actual_labor_cost INTEGER NOT NULL,
        cost_capture_requirement_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crew_attendance (
        attendance_id TEXT PRIMARY KEY,
        crew_member_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        work_date TEXT NOT NULL,
        attendance_status TEXT NOT NULL,
        check_in_time TEXT,
        check_out_time TEXT,
        labor_day REAL NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crew_performance (
        performance_id TEXT PRIMARY KEY,
        crew_member_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        planned_quantity REAL NOT NULL,
        actual_quantity REAL NOT NULL,
        planned_labor_day REAL NOT NULL,
        actual_labor_day REAL NOT NULL,
        productivity_score INTEGER NOT NULL,
        defect_count INTEGER NOT NULL,
        rework_required INTEGER NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS labor_cost_records (
        labor_cost_record_id TEXT PRIMARY KEY,
        crew_allocation_id TEXT NOT NULL,
        crew_member_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        cost_capture_entry_id TEXT,
        planned_labor_cost INTEGER NOT NULL,
        actual_labor_cost INTEGER NOT NULL,
        variance_amount INTEGER NOT NULL,
        variance_rate REAL NOT NULL,
        cost_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crew_risk_logs (
        crew_risk_log_id TEXT PRIMARY KEY,
        crew_member_id TEXT NOT NULL,
        project_id TEXT,
        risk_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS company_fixed_costs (
        fixed_cost_id TEXT PRIMARY KEY,
        cost_name_ko TEXT NOT NULL,
        cost_category TEXT NOT NULL,
        monthly_amount INTEGER NOT NULL,
        payment_day INTEGER NOT NULL,
        payment_method_ko TEXT NOT NULL,
        cost_status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS monthly_profit_loss (
        pl_id TEXT PRIMARY KEY,
        month_key TEXT NOT NULL UNIQUE,
        monthly_revenue INTEGER NOT NULL,
        monthly_direct_cost INTEGER NOT NULL,
        monthly_labor_cost INTEGER NOT NULL,
        monthly_subcontract_cost INTEGER NOT NULL,
        monthly_material_cost INTEGER NOT NULL,
        monthly_transport_cost INTEGER NOT NULL,
        monthly_waste_cost INTEGER NOT NULL,
        monthly_fixed_cost INTEGER NOT NULL,
        operating_profit INTEGER NOT NULL,
        net_cashflow INTEGER NOT NULL,
        profit_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS company_cashflow_forecast (
        forecast_id TEXT PRIMARY KEY,
        forecast_date TEXT NOT NULL,
        cashflow_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        project_id TEXT,
        fixed_cost_id TEXT,
        amount INTEGER NOT NULL,
        cashflow_status TEXT NOT NULL,
        running_balance INTEGER NOT NULL,
        shortage_risk INTEGER NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS leads (
        lead_id TEXT PRIMARY KEY,
        customer_name_ko TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        source_channel TEXT NOT NULL,
        consultation_status TEXT NOT NULL,
        interested_scope TEXT NOT NULL,
        expected_budget INTEGER NOT NULL,
        consultation_memo_ko TEXT NOT NULL,
        assigned_owner TEXT NOT NULL,
        next_action_ko TEXT NOT NULL,
        lost_reason_required INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lead_activities (
        activity_id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        activity_status TEXT NOT NULL,
        memo_ko TEXT NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lead_estimate_links (
        link_id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        estimate_draft_id TEXT,
        estimate_id TEXT,
        project_id TEXT,
        estimate_status TEXT NOT NULL,
        linked_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales_pipeline_metrics (
        metric_id TEXT PRIMARY KEY,
        month_key TEXT NOT NULL UNIQUE,
        total_leads INTEGER NOT NULL,
        contacted_leads INTEGER NOT NULL,
        estimate_sent_leads INTEGER NOT NULL,
        won_leads INTEGER NOT NULL,
        lost_leads INTEGER NOT NULL,
        contact_conversion_rate REAL NOT NULL,
        estimate_conversion_rate REAL NOT NULL,
        contract_conversion_rate REAL NOT NULL,
        pipeline_amount INTEGER NOT NULL,
        expected_win_amount INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lost_reason_logs (
        lost_reason_id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        reason_category TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        competitor_ko TEXT,
        lost_amount INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS qualification_results (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profit_decisions (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        revenue INTEGER NOT NULL,
        total_cost INTEGER NOT NULL,
        risk_buffer INTEGER NOT NULL,
        real_margin REAL NOT NULL,
        decision TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profit_templates (
        id TEXT PRIMARY KEY,
        project_type TEXT NOT NULL,
        area_range TEXT NOT NULL,
        cost_structure_json TEXT NOT NULL,
        crew_structure_json TEXT NOT NULL,
        duration INTEGER NOT NULL,
        margin REAL NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_matches (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        match_score REAL NOT NULL,
        applied INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS decision_overrides (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        original_decision TEXT NOT NULL,
        override_decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profit_automation_events (
        id TEXT PRIMARY KEY,
        source_module TEXT NOT NULL,
        trigger_event TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        before_state TEXT NOT NULL,
        after_state TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS live_margin_events (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        estimate_id TEXT,
        current_margin_rate REAL NOT NULL,
        threshold REAL NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auto_block_rules (
        id TEXT PRIMARY KEY,
        rule_type TEXT NOT NULL,
        target_key TEXT NOT NULL,
        occurrence_count INTEGER NOT NULL,
        risk_buffer_adjustment INTEGER NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        override_allowed INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profit_template_recommendations (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        match_score REAL NOT NULL,
        expected_margin REAL NOT NULL,
        risk_buffer_recommendation INTEGER NOT NULL,
        recommendation_payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clients (
        client_id TEXT PRIMARY KEY,
        lead_id TEXT,
        customer_name_ko TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        site_address_ko TEXT NOT NULL,
        consultation_history_json TEXT NOT NULL,
        estimate_history_json TEXT NOT NULL,
        contract_history_json TEXT NOT NULL,
        claim_history_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contracts (
        contract_id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        lead_id TEXT,
        contract_status TEXT NOT NULL,
        contract_amount INTEGER NOT NULL,
        deposit_rate REAL NOT NULL,
        interim_rate REAL NOT NULL,
        balance_rate REAL NOT NULL,
        scope_summary_ko TEXT NOT NULL,
        exclusions_ko TEXT NOT NULL,
        change_order_terms_ko TEXT NOT NULL,
        defect_warranty_terms_ko TEXT NOT NULL,
        approval_required INTEGER NOT NULL,
        approved_by TEXT,
        approved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contract_documents (
        document_id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        audience TEXT NOT NULL,
        document_status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        approval_required INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contract_approval_logs (
        contract_approval_log_id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        before_status TEXT NOT NULL,
        after_status TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_document_logs (
        client_document_log_id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        contract_id TEXT,
        project_id TEXT,
        document_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        audience TEXT NOT NULL,
        message_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS receivables (
        receivable_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        actual_received_date TEXT,
        receivable_status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payables (
        payable_id TEXT PRIMARY KEY,
        project_id TEXT,
        vendor_id TEXT,
        amount INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        actual_paid_date TEXT,
        payable_status TEXT NOT NULL,
        payable_type TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_drafts (
        estimate_draft_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_name_ko TEXT NOT NULL,
        draft_status TEXT NOT NULL,
        preliminary_estimate_json TEXT NOT NULL,
        missing_price_warnings_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_draft_inputs (
        estimate_draft_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        minimum_input_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_draft_processes (
        process_record_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        process_type TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_draft_confirmations (
        confirmation_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        question_ko TEXT NOT NULL,
        impact_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_draft_documents (
        document_record_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        audience_ko TEXT NOT NULL,
        status_ko TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_draft_warnings (
        warning_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        warning_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_draft_change_logs (
        change_log_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        change_type TEXT NOT NULL,
        before_json TEXT NOT NULL,
        after_json TEXT NOT NULL,
        diff_json TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_approval_logs (
        approval_log_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        before_status TEXT NOT NULL,
        after_status TEXT NOT NULL,
        checklist_json TEXT NOT NULL,
        blocking_reasons_json TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS final_estimates (
        final_estimate_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        final_status TEXT NOT NULL,
        final_estimate_json TEXT NOT NULL,
        created_from_approval_id TEXT NOT NULL,
        rollback_data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS final_estimate_documents (
        final_document_id TEXT PRIMARY KEY,
        final_estimate_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        audience_ko TEXT NOT NULL,
        document_status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS execution_projects (
        execution_project_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        final_estimate_id TEXT NOT NULL,
        execution_status TEXT NOT NULL,
        preliminary_execution_warning INTEGER NOT NULL,
        warning_reasons_json TEXT NOT NULL,
        created_from_approval_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS execution_documents (
        execution_document_id TEXT PRIMARY KEY,
        execution_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        document_status TEXT NOT NULL,
        warning_json TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        purchase_order_id TEXT PRIMARY KEY,
        execution_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        order_status TEXT NOT NULL,
        unknown_price_warning INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_milestones (
        milestone_id TEXT PRIMARY KEY,
        execution_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        milestone_type TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        trigger_condition_ko TEXT NOT NULL,
        amount_status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS site_report_templates (
        template_id TEXT PRIMARY KEY,
        execution_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        template_status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inspection_checklists (
        checklist_id TEXT PRIMARY KEY,
        execution_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        checklist_type TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS execution_logs (
        execution_log_id TEXT PRIMARY KEY,
        execution_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        before_status TEXT NOT NULL,
        after_status TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS site_operations (
        site_operation_id TEXT PRIMARY KEY,
        execution_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        site_status TEXT NOT NULL,
        overall_progress_rate INTEGER NOT NULL,
        blocked_processes_json TEXT NOT NULL,
        risk_flags_json TEXT NOT NULL,
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS daily_site_reports (
        report_id TEXT PRIMARY KEY,
        site_operation_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        report_date TEXT NOT NULL,
        process_progress_json TEXT NOT NULL,
        labor_json TEXT NOT NULL,
        material_json TEXT NOT NULL,
        issue_summary_ko TEXT NOT NULL,
        photo_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS material_delivery_checks (
        delivery_check_id TEXT PRIMARY KEY,
        site_operation_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        material_name_ko TEXT NOT NULL,
        related_process_id TEXT NOT NULL,
        delivery_status TEXT NOT NULL,
        quantity_status TEXT NOT NULL,
        warning_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inspection_results (
        inspection_result_id TEXT PRIMARY KEY,
        site_operation_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        inspection_type TEXT NOT NULL,
        related_process_id TEXT NOT NULL,
        result_status TEXT NOT NULL,
        blocked_processes_json TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS site_issues (
        site_issue_id TEXT PRIMARY KEY,
        site_operation_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        description_ko TEXT NOT NULL,
        risk_dashboard_visible INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS change_order_requests (
        change_order_id TEXT PRIMARY KEY,
        site_operation_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        request_reason_ko TEXT NOT NULL,
        estimate_reflection_allowed INTEGER NOT NULL,
        schedule_reflection_allowed INTEGER NOT NULL,
        approval_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS site_risk_logs (
        risk_log_id TEXT PRIMARY KEY,
        site_operation_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        risk_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description_ko TEXT NOT NULL,
        linked_issue_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS change_order_approval_logs (
        change_order_approval_log_id TEXT PRIMARY KEY,
        change_order_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        before_status TEXT NOT NULL,
        after_status TEXT NOT NULL,
        customer_approval_required INTEGER NOT NULL,
        payment_condition_required INTEGER NOT NULL,
        rollback_data_json TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS change_order_cost_impacts (
        cost_impact_id TEXT PRIMARY KEY,
        change_order_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        change_order_estimate_no TEXT NOT NULL,
        amount_status TEXT NOT NULL,
        cost_impact_json TEXT NOT NULL,
        margin_impact_json TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS change_order_schedule_impacts (
        schedule_impact_id TEXT PRIMARY KEY,
        change_order_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        delay_status TEXT NOT NULL,
        delay_days_status TEXT NOT NULL,
        schedule_impact_json TEXT NOT NULL,
        conflict_diagnostics_json TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS change_order_payment_impacts (
        payment_impact_id TEXT PRIMARY KEY,
        change_order_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        payment_condition_ko TEXT NOT NULL,
        amount_status TEXT NOT NULL,
        payment_milestone_id TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_completion_reports (
        completion_report_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        site_operation_id TEXT NOT NULL,
        completion_status TEXT NOT NULL,
        completion_date TEXT NOT NULL,
        final_scope_ko TEXT NOT NULL,
        customer_feedback_ko TEXT NOT NULL,
        defect_summary_json TEXT NOT NULL,
        claim_summary_json TEXT NOT NULL,
        rework_required INTEGER NOT NULL,
        case_library_link_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS actual_costs (
        actual_cost_id TEXT PRIMARY KEY,
        completion_report_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        material_cost INTEGER NOT NULL,
        labor_cost INTEGER NOT NULL,
        subcontract_cost INTEGER NOT NULL,
        equipment_cost INTEGER NOT NULL,
        waste_cost INTEGER NOT NULL,
        transport_cost INTEGER NOT NULL,
        total_actual_cost INTEGER NOT NULL,
        cost_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cost_capture_requirements (
        requirement_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        cost_category TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        required_stage TEXT NOT NULL,
        blocking_level TEXT NOT NULL,
        source_type TEXT NOT NULL,
        vendor_required INTEGER NOT NULL,
        amount_required INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cost_capture_entries (
        entry_id TEXT PRIMARY KEY,
        requirement_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        vendor_id TEXT,
        vendor_name_ko TEXT,
        source_document_ko TEXT,
        captured_by TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cost_capture_status (
        project_id TEXT PRIMARY KEY,
        revenue INTEGER NOT NULL,
        captured_cost INTEGER NOT NULL,
        missing_critical_count INTEGER NOT NULL,
        forecast_margin INTEGER NOT NULL,
        forecast_margin_rate REAL NOT NULL,
        completion_blocked INTEGER NOT NULL,
        red_alert_count INTEGER NOT NULL,
        ceo_alert_count INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS live_margin_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        revenue INTEGER NOT NULL,
        captured_cost INTEGER NOT NULL,
        estimated_remaining_cost INTEGER NOT NULL,
        initial_estimated_margin INTEGER NOT NULL,
        initial_estimated_margin_rate REAL NOT NULL,
        current_forecast_margin INTEGER NOT NULL,
        current_forecast_margin_rate REAL NOT NULL,
        margin_drop_rate REAL NOT NULL,
        margin_status TEXT NOT NULL,
        alert_level TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS process_cost_leaks (
        leak_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        requirement_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        cost_category TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        baseline_amount INTEGER NOT NULL,
        actual_amount INTEGER NOT NULL,
        variance_amount INTEGER NOT NULL,
        variance_rate REAL NOT NULL,
        severity TEXT NOT NULL,
        alert_message_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cost_leak_analysis (
        analysis_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        leak_type TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        severity TEXT NOT NULL,
        related_requirement_id TEXT,
        action_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS actual_durations (
        actual_duration_id TEXT PRIMARY KEY,
        completion_report_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        estimated_duration_days INTEGER NOT NULL,
        actual_duration_days INTEGER NOT NULL,
        duration_variance_days INTEGER NOT NULL,
        delay_reasons_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS final_margin_reports (
        final_margin_report_id TEXT PRIMARY KEY,
        completion_report_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        final_contract_amount INTEGER NOT NULL,
        final_additional_work_amount INTEGER NOT NULL,
        total_revenue INTEGER NOT NULL,
        total_actual_cost INTEGER NOT NULL,
        final_margin_amount INTEGER NOT NULL,
        final_margin_rate REAL NOT NULL,
        margin_status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_vs_actual_reports (
        report_id TEXT PRIMARY KEY,
        completion_report_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        estimated_cost INTEGER NOT NULL,
        actual_cost INTEGER NOT NULL,
        cost_variance INTEGER NOT NULL,
        cost_variance_rate REAL NOT NULL,
        estimated_duration_days INTEGER NOT NULL,
        actual_duration_days INTEGER NOT NULL,
        duration_variance_days INTEGER NOT NULL,
        variance_reasons_json TEXT NOT NULL,
        correction_candidates_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS master_db_update_candidates (
        candidate_id TEXT PRIMARY KEY,
        source_project_id TEXT NOT NULL,
        source_completion_report_id TEXT NOT NULL,
        target_db TEXT NOT NULL,
        target_item_id TEXT NOT NULL,
        current_value_json TEXT NOT NULL,
        proposed_value_json TEXT NOT NULL,
        candidate_reason_ko TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS case_library (
        case_id TEXT PRIMARY KEY,
        source_project_id TEXT NOT NULL,
        source_completion_report_id TEXT NOT NULL,
        categories_json TEXT NOT NULL,
        actual_cost_json TEXT NOT NULL,
        actual_duration_json TEXT NOT NULL,
        defects_json TEXT NOT NULL,
        claims_json TEXT NOT NULL,
        change_orders_json TEXT NOT NULL,
        final_margin_json TEXT NOT NULL,
        case_status TEXT NOT NULL,
        learning_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS defect_patterns (
        pattern_id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        pattern_name_ko TEXT NOT NULL,
        occurrence_count INTEGER NOT NULL,
        severity TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        detection_rule_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profit_patterns (
        pattern_id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        pattern_name_ko TEXT NOT NULL,
        occurrence_count INTEGER NOT NULL,
        profit_signal_ko TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        detection_rule_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS learning_suggestions (
        suggestion_id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        suggestion_type TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        suggestion_ko TEXT NOT NULL,
        approval_required INTEGER NOT NULL,
        approval_id TEXT,
        status TEXT NOT NULL,
        rollback_required INTEGER NOT NULL,
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cost_leak_root_causes (
        root_cause_id TEXT PRIMARY KEY,
        leak_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        requirement_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        cost_category TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        root_cause_type TEXT NOT NULL,
        root_cause_name_ko TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        approval_required INTEGER NOT NULL,
        case_library_link_json TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS root_cause_patterns (
        pattern_id TEXT PRIMARY KEY,
        root_cause_type TEXT NOT NULL,
        root_cause_name_ko TEXT NOT NULL,
        occurrence_count INTEGER NOT NULL,
        affected_projects_json TEXT NOT NULL,
        affected_items_json TEXT NOT NULL,
        severity TEXT NOT NULL,
        detection_rule_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS root_cause_learning_suggestions (
        suggestion_id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        root_cause_type TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        suggestion_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        approval_required INTEGER NOT NULL,
        linked_learning_suggestion_id TEXT,
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prevention_rules (
        rule_id TEXT PRIMARY KEY,
        source_pattern_id TEXT NOT NULL,
        root_cause_type TEXT NOT NULL,
        mapped_action TEXT NOT NULL,
        project_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        enforcement_level TEXT NOT NULL,
        display_severity TEXT NOT NULL,
        occurrence_count INTEGER NOT NULL,
        approval_required_on_remove INTEGER NOT NULL,
        status TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_mandatory_items (
        mandatory_item_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        enforcement_level TEXT NOT NULL,
        status TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_rule_overrides (
        override_id TEXT PRIMARY KEY,
        estimate_draft_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        override_action TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        rollback_data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auto_update_candidates (
        candidate_id TEXT PRIMARY KEY,
        suggestion_id TEXT NOT NULL,
        target_db TEXT NOT NULL,
        target_item_id TEXT NOT NULL,
        proposed_change_json TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        rollback_data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS learning_approval_logs (
        learning_approval_log_id TEXT PRIMARY KEY,
        suggestion_id TEXT NOT NULL,
        candidate_id TEXT,
        approval_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        before_status TEXT NOT NULL,
        after_status TEXT NOT NULL,
        master_db_request_id TEXT,
        rollback_snapshot_id TEXT,
        reason_ko TEXT NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS learning_update_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        suggestion_id TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        target_db TEXT NOT NULL,
        target_item_id TEXT NOT NULL,
        before_value_json TEXT NOT NULL,
        after_value_json TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        rollback_available INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_inputs (
        project_id TEXT PRIMARY KEY,
        minimum_input_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS preset_results (
        preset_result_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        preset_id TEXT NOT NULL,
        preset_name_ko TEXT NOT NULL,
        applied_rules_json TEXT NOT NULL,
        default_specs_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS generated_processes (
        process_record_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        decision_status TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        price_status TEXT NOT NULL,
        source_status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS needs_confirmations (
        confirmation_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        required_by TEXT NOT NULL,
        blocking_level TEXT NOT NULL,
        related_process_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_plans (
        payment_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        milestone_type TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        amount_status TEXT NOT NULL,
        trigger_condition_ko TEXT NOT NULL,
        expected_date TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_requirements (
        purchase_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        item_type TEXT NOT NULL,
        required_for_process_ko TEXT NOT NULL,
        price_status TEXT NOT NULL,
        lead_time_status TEXT NOT NULL,
        order_timing_rule_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schedule_drafts (
        schedule_item_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        process_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        sequence_no INTEGER NOT NULL,
        start_rule_ko TEXT NOT NULL,
        duration_status TEXT NOT NULL,
        dependencies_json TEXT NOT NULL,
        risk_flags_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_vs_actual (
        record_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        variance_type TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        action_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS repeated_defects (
        defect_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        defect_name_ko TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        action_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS repeated_loss_processes (
        loss_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        action_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    db.approval.exec(`
      CREATE TABLE IF NOT EXISTS approvals (
        approval_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        approval_type TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        rollback_required INTEGER NOT NULL,
        rollback_status TEXT NOT NULL,
        blocking_impact_ko TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        decided_by TEXT,
        decided_at TEXT,
        decision_reason_ko TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS approval_actions (
        action_id TEXT PRIMARY KEY,
        approval_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        before_status TEXT NOT NULL,
        after_status TEXT NOT NULL,
        rollback_required INTEGER NOT NULL,
        rollback_status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    db.master.exec(`
      CREATE TABLE IF NOT EXISTS master_db_update_requests (
        request_id TEXT PRIMARY KEY,
        source_project_id TEXT NOT NULL,
        target_db TEXT NOT NULL,
        target_item_id TEXT NOT NULL,
        current_value_json TEXT NOT NULL,
        proposed_value_json TEXT NOT NULL,
        change_reason_ko TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        impact_analysis_json TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        rollback_data_json TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        approved_by TEXT,
        approved_at TEXT,
        applied_at TEXT
      );

      CREATE TABLE IF NOT EXISTS master_db_values (
        item_id TEXT PRIMARY KEY,
        target_db TEXT NOT NULL,
        value_json TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        approval_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS master_db_rollback_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        target_item_id TEXT NOT NULL,
        before_value_json TEXT NOT NULL,
        after_value_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bathroom_pricing_standards (
        standard_id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        package_code TEXT NOT NULL,
        package_name_ko TEXT NOT NULL,
        installation_method TEXT NOT NULL,
        cost_floor INTEGER NOT NULL,
        minimum_margin_rate REAL NOT NULL,
        minimum_allowed_price INTEGER NOT NULL,
        recommended_price INTEGER NOT NULL,
        target_margin_rate REAL NOT NULL,
        included_items_json TEXT NOT NULL,
        excluded_upsells_json TEXT NOT NULL,
        rule_status TEXT NOT NULL,
        source_project_id TEXT NOT NULL,
        source_evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bathroom_pricing_options (
        option_id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        option_type TEXT NOT NULL,
        default_included INTEGER NOT NULL,
        cost_basis INTEGER,
        minimum_sale_price INTEGER,
        approval_required INTEGER NOT NULL,
        customer_visible INTEGER NOT NULL,
        pricing_status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kitchen_pricing_standards (
        standard_id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        package_code TEXT NOT NULL,
        package_name_ko TEXT NOT NULL,
        cost_floor INTEGER NOT NULL,
        minimum_margin_rate REAL NOT NULL,
        minimum_allowed_price INTEGER NOT NULL,
        recommended_price INTEGER NOT NULL,
        target_margin_rate REAL NOT NULL,
        included_items_json TEXT NOT NULL,
        excluded_upsells_json TEXT NOT NULL,
        rule_status TEXT NOT NULL,
        source_evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kitchen_pricing_options (
        option_id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        option_type TEXT NOT NULL,
        default_included INTEGER NOT NULL,
        cost_basis INTEGER,
        minimum_sale_price INTEGER,
        approval_required INTEGER NOT NULL,
        customer_visible INTEGER NOT NULL,
        pricing_status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_type_configs (
        project_type TEXT PRIMARY KEY,
        display_name_ko TEXT NOT NULL,
        package_field TEXT NOT NULL,
        config_status TEXT NOT NULL,
        margin_rules_json TEXT NOT NULL,
        cost_capture_rules_json TEXT NOT NULL,
        source_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_type_packages (
        package_id TEXT PRIMARY KEY,
        project_type TEXT NOT NULL,
        package_code TEXT NOT NULL,
        package_name_ko TEXT NOT NULL,
        cost_floor INTEGER NOT NULL,
        minimum_margin_rate REAL NOT NULL,
        minimum_allowed_price INTEGER NOT NULL,
        recommended_price INTEGER NOT NULL,
        target_margin_rate REAL NOT NULL,
        included_items_json TEXT NOT NULL,
        excluded_options_json TEXT NOT NULL,
        package_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_type_mandatory_items (
        mandatory_item_id TEXT PRIMARY KEY,
        project_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        enforcement_level TEXT NOT NULL,
        cost_category TEXT NOT NULL,
        required_stage TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        approval_required_on_remove INTEGER NOT NULL,
        item_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_type_options (
        option_id TEXT PRIMARY KEY,
        project_type TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        option_type TEXT NOT NULL,
        default_included INTEGER NOT NULL,
        pricing_status TEXT NOT NULL,
        customer_visible INTEGER NOT NULL,
        approval_required INTEGER NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_price_catalog (
        price_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        vendor_name_ko TEXT NOT NULL,
        material_id TEXT NOT NULL,
        material_name_ko TEXT NOT NULL,
        category TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        model_name TEXT NOT NULL,
        standard_spec TEXT NOT NULL,
        unit TEXT NOT NULL,
        supplier_price INTEGER,
        internal_price INTEGER,
        price_status TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_date TEXT NOT NULL,
        confidence_level TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_price_history (
        history_id TEXT PRIMARY KEY,
        price_id TEXT,
        vendor_id TEXT,
        vendor_name_ko TEXT NOT NULL,
        material_id TEXT NOT NULL,
        material_name_ko TEXT NOT NULL,
        project_id TEXT NOT NULL,
        actual_unit_price INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        total_amount INTEGER NOT NULL,
        source_type TEXT NOT NULL,
        source_document_ko TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        learning_candidate_status TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS material_price_mapping (
        mapping_id TEXT PRIMARY KEY,
        project_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        material_id TEXT NOT NULL,
        material_name_ko TEXT NOT NULL,
        category TEXT NOT NULL,
        price_priority_json TEXT NOT NULL,
        fallback_basis TEXT NOT NULL,
        mapping_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_price_approval_logs (
        approval_log_id TEXT PRIMARY KEY,
        price_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        before_status_json TEXT NOT NULL,
        after_status_json TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_price_evidence (
        evidence_id TEXT PRIMARY KEY,
        price_id TEXT NOT NULL,
        evidence_type TEXT NOT NULL,
        evidence_memo_ko TEXT NOT NULL,
        source_document_ko TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_price_rollback_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        price_id TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        rollback_available INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS margin_safety_rules (
        rule_id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        minimum_margin_rate REAL NOT NULL,
        warning_margin_rate REAL NOT NULL,
        target_margin_rate REAL NOT NULL,
        block_below_price INTEGER NOT NULL,
        approval_required INTEGER NOT NULL,
        blocking_message_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    db.logs.exec(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        log_id TEXT PRIMARY KEY,
        time_label TEXT NOT NULL,
        level TEXT NOT NULL,
        message_ko TEXT NOT NULL,
        related_project_id TEXT NOT NULL,
        action_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        job_id TEXT PRIMARY KEY,
        job_name TEXT NOT NULL,
        job_type TEXT NOT NULL,
        interval_minutes INTEGER NOT NULL,
        enabled INTEGER NOT NULL,
        last_run_at TEXT,
        next_run_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS job_execution_logs (
        execution_id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        status TEXT NOT NULL,
        detected_event_count INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS event_triggers (
        trigger_id TEXT PRIMARY KEY,
        trigger_key TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        event_category TEXT NOT NULL,
        severity TEXT NOT NULL,
        project_id TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        message_ko TEXT NOT NULL,
        next_action_ko TEXT NOT NULL,
        blocking_required INTEGER NOT NULL,
        status TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        resolved_at TEXT,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        role_id TEXT PRIMARY KEY,
        role_name TEXT NOT NULL,
        display_name_ko TEXT NOT NULL,
        description_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        user_name_ko TEXT NOT NULL,
        role_id TEXT NOT NULL,
        user_status TEXT NOT NULL,
        is_local_mock INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permissions (
        permission_id TEXT PRIMARY KEY,
        permission_key TEXT NOT NULL,
        role_id TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        scope_json TEXT NOT NULL,
        description_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(permission_key, role_id)
      );

      CREATE TABLE IF NOT EXISTS user_permission_logs (
        permission_log_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        permission_key TEXT NOT NULL,
        action_type TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        reason_ko TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS action_logs (
        action_log_id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        project_id TEXT NOT NULL,
        approval_id TEXT,
        payload_json TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    ensureColumn(db.project, 'estimate_drafts', 'estimated_cost', 'estimated_cost INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'estimate_drafts', 'estimated_margin', 'estimated_margin INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'estimate_drafts', 'estimated_margin_rate', 'estimated_margin_rate REAL NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'estimate_drafts', 'margin_safety_status', "margin_safety_status TEXT NOT NULL DEFAULT 'NOT_EVALUATED'");
    ensureColumn(db.project, 'estimate_drafts', 'lead_id', 'lead_id TEXT');
    ensureColumn(db.project, 'leads', 'area_m2', 'area_m2 REAL NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'leads', 'location_ko', "location_ko TEXT NOT NULL DEFAULT 'UNKNOWN'");
    ensureColumn(db.project, 'leads', 'client_type', "client_type TEXT NOT NULL DEFAULT 'RESIDENTIAL'");
    ensureColumn(db.project, 'leads', 'qualification_decision', "qualification_decision TEXT NOT NULL DEFAULT 'CONDITIONAL'");
    ensureColumn(db.project, 'profit_templates', 'location_ko', "location_ko TEXT NOT NULL DEFAULT 'UNKNOWN'");
    ensureColumn(db.project, 'profit_templates', 'estimate_structure_json', "estimate_structure_json TEXT NOT NULL DEFAULT '{}'");
    ensureColumn(db.project, 'profit_templates', 'schedule_structure_json', "schedule_structure_json TEXT NOT NULL DEFAULT '{}'");
    ensureColumn(db.project, 'profit_templates', 'root_cause_summary_json', "root_cause_summary_json TEXT NOT NULL DEFAULT '[]'");
    ensureColumn(db.project, 'profit_templates', 'prevention_rules_applied_json', "prevention_rules_applied_json TEXT NOT NULL DEFAULT '[]'");
    ensureColumn(db.project, 'cost_leak_root_causes', 'estimate_id', 'estimate_id TEXT');
    ensureColumn(db.project, 'cost_leak_root_causes', 'financial_impact', 'financial_impact INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'cost_leak_root_causes', 'recommended_prevention', "recommended_prevention TEXT NOT NULL DEFAULT 'NEEDS_REVIEW'");
    ensureColumn(db.project, 'final_estimates', 'estimated_cost', 'estimated_cost INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'final_estimates', 'estimated_margin', 'estimated_margin INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'final_estimates', 'estimated_margin_rate', 'estimated_margin_rate REAL NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'final_estimates', 'margin_safety_status', "margin_safety_status TEXT NOT NULL DEFAULT 'NOT_EVALUATED'");
  }

  function countRows(database, tableName) {
    return database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
  }

  function ensureColumn(database, tableName, columnName, columnDefinition) {
    const columns = database.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
    if (!columns.includes(columnName)) {
      database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
    }
  }

  function seedIfEmpty() {
    if (countRows(db.project, 'projects') === 0) {
      seedProjects();
      seedProjectLearningData();
    }

    if (countRows(db.approval, 'approvals') === 0) {
      seedApprovals();
    }

    if (countRows(db.master, 'master_db_update_requests') === 0) {
      seedMasterRequests();
    }
    seedBathroomPricingStandardV2();
    seedKitchenPricingStandardV1();
    seedUniversalProjectTypeConfigs();
    seedVendorRealPriceIntegrationLayer();

    if (countRows(db.logs, 'notification_logs') === 0) {
      seedNotificationLogs();
    }

    seedScheduledJobs();
    seedUserRolePermissions();

    seedCostCaptureV2();
    seedPortfolioResourceLayer();
    seedCrewHrManagementLayer();
    seedCompanyFinanceControlLayer();
    seedSalesPipelineLayer();
    seedClientContractLayer();
  }

  function seedProjects() {
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT INTO projects (
        project_id, project_name_ko, current_process_ko, today_tasks_json,
        deadline, risk_score, risk_level, profit_rate, receivable_amount,
        progress_rate, remaining_days, receivable_status_ko, defect_risk_ko,
        next_action_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['PRJ-APT-2401', '24평 구축 아파트 전체 리모델링', '욕실 방수 검수', ['방수 검수', '중도금 청구 판단', '타일 공정 차단'], '2026-07-24', 92, 'BLOCKING', '18.2%', '0원', '42%', 90, '중도금 청구 가능', '누수 리스크', '방수 검수 실패로 타일 공정 차단'],
      ['PRJ-OFFICE-1201', '상가 사무실 인테리어', '전기 증설', ['전기 부하 확인', '증설 범위 확정'], '2026-06-30', 78, 'HIGH', '21.5%', '0원', '31%', 66, '계약금 확인 완료', '전기 부하 확인 필요', '전기 증설 조건 확인'],
      ['PRJ-BATH-0501', '욕실 단독 리모델링', '타일 발주 대기', ['타일 발주', '대체 브랜드 승인', '납기 확인'], '2026-05-14', 74, 'HIGH', '16.8%', '0원', '18%', 19, '계약금 입금 예정', '발주 지연 리스크', '대체 타일 또는 긴급 발주 승인'],
      ['PRJ-KITCHEN-0301', '주방 리모델링', '상판 실측', ['미수금 확인', '상판 실측', '자재비 지급 보류 판단'], '2026-05-28', 61, 'MEDIUM', '14.1%', '12,400,000원', '64%', 33, '미수금 발생', '낮음', '미수금 확인 및 청구 follow-up']
    ].forEach((row) => insert.run(...row.slice(0, 3), toJson(row[3]), ...row.slice(4), createdAt, createdAt));

    const estimate = db.project.prepare('INSERT INTO estimates (estimate_id, project_id, estimate_type, amount_text, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    estimate.run('EST-APT-2401-001', 'PRJ-APT-2401', 'customerEstimate', '60,000,000원', toJson({ basis: 'initial dashboard seed' }), createdAt);
  }

  function parseWonText(value) {
    const numeric = Number(String(value || '').replace(/[^\d-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function parsePercentText(value) {
    const numeric = Number(String(value || '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(numeric) ? numeric / 100 : 0;
  }

  function inferPortfolioStatus(project) {
    const current = project.current_process_ko || '';
    if (current.includes('COMPLETED')) return 'COMPLETED';
    if (current.includes('IN_PROGRESS') || current.includes('검수') || current.includes('시공') || current.includes('실측')) return 'IN_PROGRESS';
    if (current.includes('EXECUTION_READY')) return 'EXECUTION_READY';
    if (current.includes('FINAL_ESTIMATE')) return 'FINAL_ESTIMATE';
    return project.progress_rate === '0%' ? 'PRELIMINARY' : 'IN_PROGRESS';
  }

  function seedPortfolioResourceLayer() {
    syncPortfolioProjects();
    seedPortfolioAllocations();
    seedPortfolioCashflow();
    detectResourceConflicts();
  }

  function syncPortfolioProjects() {
    const updatedAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR REPLACE INTO portfolio_projects (
        portfolio_project_id, project_id, project_status, revenue_amount, cost_amount,
        expected_margin, expected_margin_rate, risk_level, red_alert_count,
        start_date, end_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    db.project.prepare('SELECT * FROM projects').all().forEach((project) => {
      const revenue = project.project_id === 'PRJ-APT-2401' ? 60000000
        : project.project_id === 'PRJ-OFFICE-1201' ? 42000000
          : project.project_id === 'PRJ-BATH-0501' ? 8500000
            : project.project_id === 'PRJ-KITCHEN-0301' ? 12000000
              : parseWonText(project.receivable_amount);
      const marginRate = parsePercentText(project.profit_rate);
      const expectedMargin = Math.round(revenue * marginRate);
      const costAmount = Math.max(0, revenue - expectedMargin);
      insert.run(
        `PF-${project.project_id}`,
        project.project_id,
        inferPortfolioStatus(project),
        revenue,
        costAmount,
        expectedMargin,
        marginRate,
        project.risk_level,
        project.risk_level === 'BLOCKING' ? 2 : project.risk_level === 'HIGH' ? 1 : 0,
        project.created_at?.slice(0, 10) || updatedAt.slice(0, 10),
        project.deadline,
        updatedAt
      );
    });
  }

  function seedPortfolioAllocations() {
    if (countRows(db.project, 'resource_allocations') > 0) return;
    const createdAt = nowIso();
    const rows = [
      ['ALLOC-001', 'RES-TILE-001', '타일 A팀', 'Master', 'PRJ-APT-2401', 'ALLOCATED', '2026-05-10', '2026-05-16', 1, '욕실/발코니 타일'],
      ['ALLOC-002', 'RES-TILE-001', '타일 A팀', 'Master', 'PRJ-BATH-0501', 'ALLOCATED', '2026-05-14', '2026-05-18', 1, '욕실 단독 타일'],
      ['ALLOC-003', 'RES-ELEC-001', '전기 팀장', 'TeamLead', 'PRJ-OFFICE-1201', 'ALLOCATED', '2026-05-12', '2026-05-20', 0.8, '전기 증설'],
      ['ALLOC-004', 'RES-PM-001', '현장관리자 김팀장', 'SiteManager', 'PRJ-KITCHEN-0301', 'ALLOCATED', '2026-05-08', '2026-05-28', 0.5, '주방 공정 관리']
    ];
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO resource_allocations (
        allocation_id, resource_id, resource_name_ko, resource_role, project_id,
        allocation_status, start_date, end_date, allocation_rate, notes_ko,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    rows.forEach((row) => insert.run(...row, createdAt, createdAt));
  }

  function seedPortfolioCashflow() {
    if (countRows(db.project, 'portfolio_cashflow') > 0) return;
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO portfolio_cashflow (
        cashflow_id, project_id, cashflow_type, amount, expected_date, actual_date,
        cashflow_status, source_type, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['PCF-001', 'PRJ-APT-2401', 'INFLOW', 24000000, '2026-05-15', null, 'EXPECTED', 'INTERIM_PAYMENT', '중도금 예정'],
      ['PCF-002', 'PRJ-APT-2401', 'OUTFLOW', 12800000, '2026-05-13', null, 'EXPECTED', 'MATERIAL_PAYMENT', '타일/목공 자재 지급'],
      ['PCF-003', 'PRJ-KITCHEN-0301', 'INFLOW', 12400000, '2026-05-18', null, 'OVERDUE', 'RECEIVABLE', '미수금 회수 필요'],
      ['PCF-004', 'PRJ-BATH-0501', 'OUTFLOW', 2600000, '2026-05-12', null, 'EXPECTED', 'PROCUREMENT', '타일/도기 발주']
    ].forEach((row) => insert.run(...row, createdAt, createdAt));
  }

  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return new Date(aStart) <= new Date(bEnd) && new Date(bStart) <= new Date(aEnd);
  }

  function detectResourceConflicts() {
    const detectedAt = nowIso();
    const allocations = db.project.prepare(`
      SELECT *
      FROM resource_allocations
      WHERE allocation_status = 'ALLOCATED'
    `).all();
    db.project.prepare("UPDATE resource_conflicts SET status = 'RESOLVED', resolved_at = ? WHERE status = 'ACTIVE'").run(detectedAt);
    const insert = db.project.prepare(`
      INSERT OR REPLACE INTO resource_conflicts (
        conflict_id, resource_id, resource_name_ko, conflict_type, severity,
        project_ids_json, conflict_date_range_json, message_ko, status,
        detected_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (let i = 0; i < allocations.length; i += 1) {
      for (let j = i + 1; j < allocations.length; j += 1) {
        const left = allocations[i];
        const right = allocations[j];
        if (left.resource_id !== right.resource_id) continue;
        if (left.project_id === right.project_id) continue;
        if (!rangesOverlap(left.start_date, left.end_date, right.start_date, right.end_date)) continue;
        const start = left.start_date > right.start_date ? left.start_date : right.start_date;
        const end = left.end_date < right.end_date ? left.end_date : right.end_date;
        insert.run(
          `RC-${left.resource_id}-${left.project_id}-${right.project_id}`,
          left.resource_id,
          left.resource_name_ko,
          'SAME_RESOURCE_OVERLAP',
          'WARNING',
          toJson([left.project_id, right.project_id]),
          toJson({ startDate: start, endDate: end }),
          `${left.resource_name_ko}이 ${start}~${end} 기간에 2개 프로젝트에 동시 배정되었습니다.`,
          'ACTIVE',
          detectedAt,
          null
        );
      }
    }
  }

  function seedCrewHrManagementLayer() {
    seedCrewMembers();
    seedCrewSkills();
    seedCrewAllocations();
    seedCrewAttendance();
    seedCrewPerformance();
    syncLaborCostRecords();
    detectCrewRisks();
  }

  function seedCrewMembers() {
    if (countRows(db.project, 'crew_members') > 0) return;
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO crew_members (
        crew_member_id, member_name_ko, crew_type, role, daily_wage,
        minimum_labor_day, productivity_standard_json, current_project_id,
        availability_json, reliability_score, defect_history_count,
        absence_history_count, status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['CREW-001', '타일 A팀', 'Master', 'tile_master', 320000, 1, { unit: 'm2/day', value: 18 }, 'PRJ-APT-2401', { availableFrom: '2026-05-17' }, 82, 1, 0, 'ACTIVE', '직영 핵심 타일팀'],
      ['CREW-002', '김팀장', 'TeamLeader', 'site_team_leader', 280000, 1, { unit: 'site/day', value: 1 }, 'PRJ-KITCHEN-0301', { availableFrom: '2026-05-29' }, 88, 0, 1, 'ACTIVE', '현장관리 가능'],
      ['CREW-003', '박기공', 'SkilledWorker', 'plumbing_worker', 260000, 1, { unit: 'bath/day', value: 1 }, null, { availableFrom: '2026-05-04' }, 79, 1, 2, 'ACTIVE', '설비/도기 가능'],
      ['CREW-004', '이조공', 'Helper', 'helper', 160000, 0.5, { unit: 'support/day', value: 1 }, null, { availableFrom: '2026-05-04' }, 72, 0, 3, 'ACTIVE', '철거/운반 지원'],
      ['CREW-005', '전기 외주팀', 'SubcontractCrew', 'electrical_subcontract', 450000, 1, { unit: 'site/day', value: 1 }, 'PRJ-OFFICE-1201', { availableFrom: '2026-05-21' }, 76, 2, 0, 'ACTIVE', '전기 증설 외주']
    ].forEach((row) => insert.run(
      row[0], row[1], row[2], row[3], row[4], row[5], toJson(row[6]), row[7], toJson(row[8]), row[9], row[10], row[11], row[12], row[13], createdAt, createdAt
    ));
  }

  function seedCrewSkills() {
    if (countRows(db.project, 'crew_skills') > 0) return;
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO crew_skills (
        crew_skill_id, crew_member_id, process_id, process_name_ko,
        skill_level, productivity_unit, productivity_value, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['CS-001', 'CREW-001', 'tile_installation', '타일 시공', 'MASTER', 'm2/day', 18],
      ['CS-002', 'CREW-001', 'grout_finish', '줄눈', 'HIGH', 'm2/day', 25],
      ['CS-003', 'CREW-002', 'site_management', '현장관리', 'HIGH', 'site/day', 1],
      ['CS-004', 'CREW-003', 'fixture_installation', '도기 설치', 'HIGH', 'bath/day', 1],
      ['CS-005', 'CREW-004', 'demolition_support', '철거 보조', 'MEDIUM', 'site/day', 1],
      ['CS-006', 'CREW-005', 'electrical_upgrade', '전기 증설', 'HIGH', 'site/day', 1]
    ].forEach((row) => insert.run(...row, createdAt));
  }

  function seedCrewAllocations() {
    if (countRows(db.project, 'crew_allocations') > 0) return;
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO crew_allocations (
        crew_allocation_id, crew_member_id, project_id, process_id, process_name_ko,
        allocation_status, planned_start_date, planned_end_date, actual_start_date,
        actual_end_date, planned_labor_day, actual_labor_day, planned_labor_cost,
        actual_labor_cost, cost_capture_requirement_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['CA-001', 'CREW-001', 'PRJ-APT-2401', 'tile_installation', '타일 시공', 'ALLOCATED', '2026-05-10', '2026-05-16', null, null, 4, 0, 1280000, 0, 'CCR-PRJ-PROD-BATH-0001-LABOR'],
      ['CA-002', 'CREW-001', 'PRJ-BATH-0501', 'tile_installation', '욕실 타일', 'ALLOCATED', '2026-05-14', '2026-05-18', null, null, 2, 0, 640000, 0, null],
      ['CA-003', 'CREW-003', 'PRJ-BATH-0501', 'fixture_installation', '도기 설치', 'PLANNED', '2026-05-19', '2026-05-19', null, null, 1, 0, 260000, 0, null],
      ['CA-004', 'CREW-005', 'PRJ-OFFICE-1201', 'electrical_upgrade', '전기 증설', 'ALLOCATED', '2026-05-12', '2026-05-20', null, null, 5, 0, 2250000, 0, null]
    ].forEach((row) => insert.run(...row, createdAt, createdAt));
  }

  function seedCrewAttendance() {
    if (countRows(db.project, 'crew_attendance') > 0) return;
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO crew_attendance (
        attendance_id, crew_member_id, project_id, work_date, attendance_status,
        check_in_time, check_out_time, labor_day, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['CAT-001', 'CREW-001', 'PRJ-APT-2401', '2026-05-10', 'PRESENT', '08:30', '17:30', 1, '정상 출근'],
      ['CAT-002', 'CREW-004', 'PRJ-APT-2401', '2026-05-10', 'LATE', '09:20', '17:30', 0.8, '지각']
    ].forEach((row) => insert.run(...row, createdAt));
  }

  function seedCrewPerformance() {
    if (countRows(db.project, 'crew_performance') > 0) return;
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO crew_performance (
        performance_id, crew_member_id, project_id, process_id,
        planned_quantity, actual_quantity, planned_labor_day, actual_labor_day,
        productivity_score, defect_count, rework_required, notes_ko,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['CP-001', 'CREW-001', 'PRJ-APT-2401', 'tile_installation', 72, 60, 4, 4.5, 74, 1, 0, '생산성 기준 대비 낮음'],
      ['CP-002', 'CREW-004', 'PRJ-APT-2401', 'demolition_support', 1, 1, 1, 1.2, 70, 0, 0, '지각으로 품수 증가']
    ].forEach((row) => insert.run(...row, createdAt, createdAt));
  }

  function syncLaborCostRecords() {
    const updatedAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR REPLACE INTO labor_cost_records (
        labor_cost_record_id, crew_allocation_id, crew_member_id, project_id,
        cost_capture_entry_id, planned_labor_cost, actual_labor_cost,
        variance_amount, variance_rate, cost_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM labor_cost_records WHERE labor_cost_record_id = ?), ?), ?)
    `);
    db.project.prepare('SELECT * FROM crew_allocations').all().forEach((allocation) => {
      const actual = Number(allocation.actual_labor_cost || 0);
      const planned = Number(allocation.planned_labor_cost || 0);
      const variance = actual > 0 ? actual - planned : 0;
      const varianceRate = planned > 0 ? variance / planned : 0;
      const status = actual === 0 ? 'PENDING_CAPTURE' : varianceRate > 0.15 ? 'OVER_BASELINE' : 'CAPTURED';
      const id = `LCR-${allocation.crew_allocation_id}`;
      insert.run(
        id,
        allocation.crew_allocation_id,
        allocation.crew_member_id,
        allocation.project_id,
        null,
        planned,
        actual,
        variance,
        varianceRate,
        status,
        id,
        updatedAt,
        updatedAt
      );
    });
  }

  function detectCrewRisks() {
    const createdAt = nowIso();
    db.project.prepare("UPDATE crew_risk_logs SET status = 'RESOLVED', resolved_at = ? WHERE status = 'ACTIVE'").run(createdAt);
    const insert = db.project.prepare(`
      INSERT OR REPLACE INTO crew_risk_logs (
        crew_risk_log_id, crew_member_id, project_id, risk_type, severity,
        message_ko, status, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM crew_risk_logs WHERE crew_risk_log_id = ?), ?), ?)
    `);

    db.project.prepare(`
      SELECT crew_member_id, member_name_ko, defect_history_count, absence_history_count, reliability_score
      FROM crew_members
    `).all().forEach((member) => {
      if (Number(member.absence_history_count || 0) >= 3) {
        const id = `CRISK-ABSENCE-${member.crew_member_id}`;
        insert.run(id, member.crew_member_id, null, 'ABSENCE_PATTERN', 'WARNING', `${member.member_name_ko} 결근/지각 이력이 높습니다.`, 'ACTIVE', id, createdAt, null);
      }
      if (Number(member.defect_history_count || 0) >= 2 || Number(member.reliability_score || 0) < 75) {
        const id = `CRISK-QUALITY-${member.crew_member_id}`;
        insert.run(id, member.crew_member_id, null, 'QUALITY_RISK', 'WARNING', `${member.member_name_ko} 하자 또는 신뢰도 리스크가 있습니다.`, 'ACTIVE', id, createdAt, null);
      }
    });

    const allocations = db.project.prepare(`
      SELECT a.*, m.member_name_ko
      FROM crew_allocations a
      JOIN crew_members m ON m.crew_member_id = a.crew_member_id
      WHERE a.allocation_status IN ('ALLOCATED', 'PLANNED')
    `).all();
    for (let i = 0; i < allocations.length; i += 1) {
      for (let j = i + 1; j < allocations.length; j += 1) {
        const left = allocations[i];
        const right = allocations[j];
        if (left.crew_member_id !== right.crew_member_id || left.project_id === right.project_id) continue;
        if (!rangesOverlap(left.planned_start_date, left.planned_end_date, right.planned_start_date, right.planned_end_date)) continue;
        const id = `CRISK-CONFLICT-${left.crew_member_id}-${left.project_id}-${right.project_id}`;
        insert.run(id, left.crew_member_id, left.project_id, 'DOUBLE_BOOKING', 'WARNING', `${left.member_name_ko}이 ${left.project_id} / ${right.project_id}에 동시 배정되었습니다.`, 'ACTIVE', id, createdAt, null);
      }
    }

    const laborRows = db.project.prepare("SELECT * FROM labor_cost_records WHERE cost_status IN ('PENDING_CAPTURE', 'OVER_BASELINE')").all();
    laborRows.forEach((row) => {
      const id = `CRISK-LABOR-${row.labor_cost_record_id}`;
      const severity = row.cost_status === 'OVER_BASELINE' ? 'RED' : 'WARNING';
      const message = row.cost_status === 'OVER_BASELINE'
        ? `인건비가 기준 대비 ${(Number(row.variance_rate || 0) * 100).toFixed(1)}% 초과했습니다.`
        : '실제 품수/인건비 입력이 아직 없습니다.';
      insert.run(id, row.crew_member_id, row.project_id, row.cost_status, severity, message, 'ACTIVE', id, createdAt, null);
    });
  }

  function currentMonthKey() {
    return new Date().toISOString().slice(0, 7);
  }

  function seedCompanyFinanceControlLayer() {
    seedCompanyFixedCosts();
    seedReceivablesPayables();
    rebuildMonthlyProfitLoss(currentMonthKey());
    rebuildCompanyCashflowForecast(currentMonthKey());
  }

  function seedCompanyFixedCosts() {
    if (countRows(db.project, 'company_fixed_costs') > 0) return;
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO company_fixed_costs (
        fixed_cost_id, cost_name_ko, cost_category, monthly_amount, payment_day,
        payment_method_ko, cost_status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['FC-RENT', '사무실 임대료', 'rent', 1200000, 5, '계좌이체', 'ACTIVE', '월 고정'],
      ['FC-VEHICLE', '차량비', 'vehicle', 650000, 10, '카드/계좌', 'ACTIVE', '유류/리스/보험 포함 기준'],
      ['FC-EQUIPMENT', '장비비', 'equipment', 300000, 12, '카드', 'ACTIVE', '공구/소모 장비'],
      ['FC-SALARY', '직원 급여', 'salary', 4500000, 25, '계좌이체', 'ACTIVE', '내부 인력 급여'],
      ['FC-INSURANCE', '4대보험', 'insurance', 850000, 25, '자동이체', 'ACTIVE', '급여 연동'],
      ['FC-TAX', '세무/회계비', 'tax_accounting', 300000, 20, '계좌이체', 'ACTIVE', '기장료'],
      ['FC-AD', '광고비', 'advertising', 1500000, 15, '카드', 'ACTIVE', '온라인 광고'],
      ['FC-SOFTWARE', '소프트웨어 구독료', 'software', 250000, 3, '카드', 'ACTIVE', 'BOC/업무툴'],
      ['FC-ETC', '기타 고정비', 'other_fixed', 500000, 28, '혼합', 'ACTIVE', '예비 고정비']
    ].forEach((row) => insert.run(...row, createdAt, createdAt));
  }

  function seedReceivablesPayables() {
    if (countRows(db.project, 'receivables') === 0) {
      const createdAt = nowIso();
      const insertReceivable = db.project.prepare(`
        INSERT OR IGNORE INTO receivables (
          receivable_id, project_id, amount, due_date, actual_received_date,
          receivable_status, notes_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      [
        ['REC-001', 'PRJ-APT-2401', 24000000, '2026-05-15', null, 'EXPECTED', '중도금 예정'],
        ['REC-002', 'PRJ-KITCHEN-0301', 12400000, '2026-05-18', null, 'OVERDUE', '미수금 회수 필요'],
        ['REC-003', 'PRJ-BATH-0501', 2550000, '2026-05-10', null, 'EXPECTED', '욕실 계약금/중도금 예정']
      ].forEach((row) => insertReceivable.run(...row, createdAt, createdAt));
    }

    if (countRows(db.project, 'payables') === 0) {
      const createdAt = nowIso();
      const insertPayable = db.project.prepare(`
        INSERT OR IGNORE INTO payables (
          payable_id, project_id, vendor_id, amount, due_date, actual_paid_date,
          payable_status, payable_type, notes_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      [
        ['PAY-001', 'PRJ-APT-2401', 'VENDOR-TILE', 12800000, '2026-05-13', null, 'EXPECTED', 'material', '타일/목공 자재 지급'],
        ['PAY-002', 'PRJ-BATH-0501', 'VENDOR-BATH', 2600000, '2026-05-12', null, 'EXPECTED', 'procurement', '타일/도기 발주'],
        ['PAY-003', 'PRJ-OFFICE-1201', 'VENDOR-ELEC', 4500000, '2026-05-20', null, 'EXPECTED', 'subcontract', '전기 외주비']
      ].forEach((row) => insertPayable.run(...row, createdAt, createdAt));
    }
  }

  function rebuildMonthlyProfitLoss(monthKey = currentMonthKey()) {
    syncPortfolioProjects();
    const createdAt = nowIso();
    const portfolio = db.project.prepare('SELECT * FROM portfolio_projects').all();
    const fixedCost = Number(db.project.prepare("SELECT COALESCE(SUM(monthly_amount), 0) AS total FROM company_fixed_costs WHERE cost_status = 'ACTIVE'").get().total || 0);
    const monthlyRevenue = portfolio.reduce((sum, row) => sum + Number(row.revenue_amount || 0), 0);
    const monthlyDirectCost = portfolio.reduce((sum, row) => sum + Number(row.cost_amount || 0), 0);
    const laborCost = Number(db.project.prepare('SELECT COALESCE(SUM(planned_labor_cost), 0) AS total FROM labor_cost_records').get().total || 0);
    const actualCosts = db.project.prepare('SELECT * FROM actual_costs').all();
    const materialCost = actualCosts.reduce((sum, row) => sum + Number(row.material_cost || 0), 0);
    const subcontractCost = actualCosts.reduce((sum, row) => sum + Number(row.subcontract_cost || 0), 0);
    const transportCost = actualCosts.reduce((sum, row) => sum + Number(row.transport_cost || 0), 0);
    const wasteCost = actualCosts.reduce((sum, row) => sum + Number(row.waste_cost || 0), 0);
    const operatingProfit = monthlyRevenue - monthlyDirectCost - fixedCost;
    const inflow = Number(db.project.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM receivables WHERE receivable_status != 'RECEIVED'").get().total || 0);
    const outflow = Number(db.project.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payables WHERE payable_status != 'PAID'").get().total || 0);
    const netCashflow = inflow - outflow - fixedCost;
    const profitStatus = operatingProfit < 0 ? 'LOSS' : netCashflow < 0 ? 'CASH_RISK' : 'HEALTHY';
    db.project.prepare(`
      INSERT OR REPLACE INTO monthly_profit_loss (
        pl_id, month_key, monthly_revenue, monthly_direct_cost, monthly_labor_cost,
        monthly_subcontract_cost, monthly_material_cost, monthly_transport_cost,
        monthly_waste_cost, monthly_fixed_cost, operating_profit, net_cashflow,
        profit_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM monthly_profit_loss WHERE month_key = ?), ?), ?)
    `).run(
      `PL-${monthKey}`,
      monthKey,
      monthlyRevenue,
      monthlyDirectCost,
      laborCost,
      subcontractCost,
      materialCost,
      transportCost,
      wasteCost,
      fixedCost,
      operatingProfit,
      netCashflow,
      profitStatus,
      monthKey,
      createdAt,
      createdAt
    );
  }

  function dateForPaymentDay(monthKey, day) {
    return `${monthKey}-${String(Math.max(1, Math.min(28, Number(day || 1)))).padStart(2, '0')}`;
  }

  function rebuildCompanyCashflowForecast(monthKey = currentMonthKey()) {
    const createdAt = nowIso();
    db.project.prepare('DELETE FROM company_cashflow_forecast WHERE forecast_date LIKE ?').run(`${monthKey}%`);
    const rows = [];
    db.project.prepare("SELECT * FROM receivables WHERE receivable_status != 'RECEIVED'").all().forEach((row) => {
      rows.push({ type: 'INFLOW', sourceType: 'receivable', projectId: row.project_id, fixedCostId: null, amount: Number(row.amount || 0), date: row.due_date, status: row.receivable_status, notesKo: row.notes_ko });
    });
    db.project.prepare("SELECT * FROM payables WHERE payable_status != 'PAID'").all().forEach((row) => {
      rows.push({ type: 'OUTFLOW', sourceType: row.payable_type, projectId: row.project_id, fixedCostId: null, amount: Number(row.amount || 0), date: row.due_date, status: row.payable_status, notesKo: row.notes_ko });
    });
    db.project.prepare("SELECT * FROM company_fixed_costs WHERE cost_status = 'ACTIVE'").all().forEach((row) => {
      rows.push({ type: 'OUTFLOW', sourceType: 'fixed_cost', projectId: null, fixedCostId: row.fixed_cost_id, amount: Number(row.monthly_amount || 0), date: dateForPaymentDay(monthKey, row.payment_day), status: 'EXPECTED', notesKo: row.cost_name_ko });
    });
    rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    let runningBalance = 10000000;
    const insert = db.project.prepare(`
      INSERT INTO company_cashflow_forecast (
        forecast_id, forecast_date, cashflow_type, source_type, project_id,
        fixed_cost_id, amount, cashflow_status, running_balance, shortage_risk,
        notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    rows.forEach((row, index) => {
      runningBalance += row.type === 'INFLOW' ? row.amount : -row.amount;
      insert.run(
        `CFF-${monthKey}-${index + 1}`,
        row.date,
        row.type,
        row.sourceType,
        row.projectId,
        row.fixedCostId,
        row.amount,
        row.status,
        runningBalance,
        runningBalance < 0 ? 1 : 0,
        row.notesKo,
        createdAt,
        createdAt
      );
    });
  }

  function getCompanyFinanceDashboardData() {
    const monthKey = currentMonthKey();
    seedCompanyFinanceControlLayer();
    rebuildMonthlyProfitLoss(monthKey);
    rebuildCompanyCashflowForecast(monthKey);
    const fixedCosts = db.project.prepare('SELECT * FROM company_fixed_costs ORDER BY payment_day, cost_name_ko').all();
    const pl = db.project.prepare('SELECT * FROM monthly_profit_loss WHERE month_key = ?').get(monthKey);
    const forecasts = db.project.prepare('SELECT * FROM company_cashflow_forecast ORDER BY forecast_date, forecast_id').all();
    const receivables = db.project.prepare('SELECT * FROM receivables ORDER BY due_date').all();
    const payables = db.project.prepare('SELECT * FROM payables ORDER BY due_date').all();
    const shortage = forecasts.find((row) => row.shortage_risk);
    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      monthKey,
      kpis: {
        monthlyRevenue: pl?.monthly_revenue || 0,
        monthlyCost: pl?.monthly_direct_cost || 0,
        monthlyFixedCost: pl?.monthly_fixed_cost || 0,
        operatingProfit: pl?.operating_profit || 0,
        netCashflow: pl?.net_cashflow || 0,
        receivableTotal: receivables.filter((row) => row.receivable_status !== 'RECEIVED').reduce((sum, row) => sum + Number(row.amount || 0), 0),
        payableTotal: payables.filter((row) => row.payable_status !== 'PAID').reduce((sum, row) => sum + Number(row.amount || 0), 0),
        cashShortageRisk: Boolean(shortage),
        cashShortageDate: shortage?.forecast_date || null
      },
      fixedCosts: fixedCosts.map((row) => ({
        fixedCostId: row.fixed_cost_id,
        costNameKo: row.cost_name_ko,
        costCategory: row.cost_category,
        monthlyAmount: row.monthly_amount,
        paymentDay: row.payment_day,
        paymentMethodKo: row.payment_method_ko,
        costStatus: row.cost_status,
        notesKo: row.notes_ko
      })),
      monthlyProfitLoss: pl ? {
        monthKey: pl.month_key,
        monthlyRevenue: pl.monthly_revenue,
        monthlyDirectCost: pl.monthly_direct_cost,
        monthlyLaborCost: pl.monthly_labor_cost,
        monthlySubcontractCost: pl.monthly_subcontract_cost,
        monthlyMaterialCost: pl.monthly_material_cost,
        monthlyTransportCost: pl.monthly_transport_cost,
        monthlyWasteCost: pl.monthly_waste_cost,
        monthlyFixedCost: pl.monthly_fixed_cost,
        operatingProfit: pl.operating_profit,
        netCashflow: pl.net_cashflow,
        profitStatus: pl.profit_status
      } : null,
      cashflowForecast: forecasts.map((row) => ({
        forecastId: row.forecast_id,
        forecastDate: row.forecast_date,
        cashflowType: row.cashflow_type,
        sourceType: row.source_type,
        projectId: row.project_id,
        fixedCostId: row.fixed_cost_id,
        amount: row.amount,
        cashflowStatus: row.cashflow_status,
        runningBalance: row.running_balance,
        shortageRisk: Boolean(row.shortage_risk),
        notesKo: row.notes_ko
      })),
      receivables: receivables.map((row) => ({
        receivableId: row.receivable_id,
        projectId: row.project_id,
        amount: row.amount,
        dueDate: row.due_date,
        actualReceivedDate: row.actual_received_date,
        receivableStatus: row.receivable_status,
        notesKo: row.notes_ko
      })),
      payables: payables.map((row) => ({
        payableId: row.payable_id,
        projectId: row.project_id,
        vendorId: row.vendor_id,
        amount: row.amount,
        dueDate: row.due_date,
        actualPaidDate: row.actual_paid_date,
        payableStatus: row.payable_status,
        payableType: row.payable_type,
        notesKo: row.notes_ko
      }))
    };
  }

  function leadStatusLabelKo(status) {
    const labels = {
      NEW: '신규 문의',
      CONTACTED: '상담 완료',
      VISIT_SCHEDULED: '방문 예약',
      VISITED: '방문 완료',
      ESTIMATE_SENT: '견적 발송',
      NEGOTIATING: '협의 중',
      WON: '계약',
      LOST: '실패'
    };
    return labels[status] || status;
  }

  function scopeLabelKo(scope) {
    const labels = {
      bathroom: '욕실',
      kitchen: '주방',
      full_remodel: '전체 리모델링',
      restoration: '원상복구',
      commercial: '상가'
    };
    return labels[scope] || scope;
  }

  function seedSalesPipelineLayer() {
    if (countRows(db.project, 'leads') === 0) {
      const createdAt = nowIso();
      const insertLead = db.project.prepare(`
        INSERT INTO leads (
          lead_id, customer_name_ko, contact_phone, source_channel, consultation_status,
          interested_scope, expected_budget, consultation_memo_ko, assigned_owner,
          next_action_ko, lost_reason_required, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      [
        ['LEAD-202605-001', '김민수 고객', '010-0000-0001', 'NAVER', 'NEW', 'bathroom', 8500000, '구축 아파트 욕실 단독 문의. 방수 상태 확인 필요.', 'Estimator', '24시간 내 1차 상담', 0],
        ['LEAD-202605-002', '박지현 고객', '010-0000-0002', 'REFERRAL', 'ESTIMATE_SENT', 'kitchen', 18000000, '주방 교체 견적 발송. 상판 옵션 협의 필요.', 'Estimator', '3일 내 후속 연락', 0],
        ['LEAD-202605-003', '오피스앤코', '02-000-0003', 'AD', 'NEGOTIATING', 'commercial', 42000000, '상가 인테리어 계약 조건 협의 중.', 'CEO', '계약금 조건 확정', 0],
        ['LEAD-202605-004', '이서연 고객', '010-0000-0004', 'OFFLINE', 'LOST', 'bathroom', 7000000, '가격 기준 불일치로 보류.', 'CEO', 'LOST 사유 분석', 1]
      ].forEach((row) => insertLead.run(...row, createdAt, createdAt));

      const insertActivity = db.project.prepare(`
        INSERT INTO lead_activities (
          activity_id, lead_id, activity_type, activity_status, memo_ko, actor, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertActivity.run('LEAD-ACT-001', 'LEAD-202605-001', 'LEAD_CREATED', 'NEW', '신규 욕실 리드 등록', 'BOC', createdAt);
      insertActivity.run('LEAD-ACT-002', 'LEAD-202605-002', 'ESTIMATE_SENT', 'COMPLETED', '주방 예비 견적 발송', 'Estimator', createdAt);
      insertActivity.run('LEAD-ACT-003', 'LEAD-202605-003', 'NEGOTIATION', 'IN_PROGRESS', '계약 조건 협의 중', 'CEO', createdAt);
      insertActivity.run('LEAD-ACT-004', 'LEAD-202605-004', 'LOST', 'COMPLETED', '예산 불일치로 LOST 처리', 'CEO', createdAt);

      db.project.prepare(`
        INSERT INTO lost_reason_logs (
          lost_reason_id, lead_id, reason_category, reason_ko, competitor_ko,
          lost_amount, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('LOST-LEAD-202605-004', 'LEAD-202605-004', 'PRICE_MISMATCH', '고객 예산이 V2 최소 마진 방어선보다 낮음', null, 7000000, 'CEO', createdAt);
    }
    syncSalesPipelineMetrics();
  }

  function syncSalesPipelineMetrics() {
    const monthKey = currentMonthKey();
    const now = nowIso();
    const stats = db.project.prepare(`
      SELECT
        COUNT(*) AS total_leads,
        SUM(CASE WHEN consultation_status IN ('CONTACTED', 'VISIT_SCHEDULED', 'VISITED', 'ESTIMATE_SENT', 'NEGOTIATING', 'WON', 'LOST') THEN 1 ELSE 0 END) AS contacted_leads,
        SUM(CASE WHEN consultation_status IN ('ESTIMATE_SENT', 'NEGOTIATING', 'WON', 'LOST') THEN 1 ELSE 0 END) AS estimate_sent_leads,
        SUM(CASE WHEN consultation_status = 'WON' THEN 1 ELSE 0 END) AS won_leads,
        SUM(CASE WHEN consultation_status = 'LOST' THEN 1 ELSE 0 END) AS lost_leads,
        SUM(CASE WHEN consultation_status NOT IN ('LOST') THEN expected_budget ELSE 0 END) AS pipeline_amount,
        SUM(CASE WHEN consultation_status IN ('NEGOTIATING', 'WON') THEN expected_budget ELSE 0 END) AS expected_win_amount
      FROM leads
    `).get();
    const total = Number(stats?.total_leads || 0);
    const contacted = Number(stats?.contacted_leads || 0);
    const estimateSent = Number(stats?.estimate_sent_leads || 0);
    const won = Number(stats?.won_leads || 0);
    const contactConversionRate = total > 0 ? contacted / total : 0;
    const estimateConversionRate = total > 0 ? estimateSent / total : 0;
    const contractConversionRate = total > 0 ? won / total : 0;
    db.project.prepare(`
      INSERT INTO sales_pipeline_metrics (
        metric_id, month_key, total_leads, contacted_leads, estimate_sent_leads,
        won_leads, lost_leads, contact_conversion_rate, estimate_conversion_rate,
        contract_conversion_rate, pipeline_amount, expected_win_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(month_key) DO UPDATE SET
        total_leads = excluded.total_leads,
        contacted_leads = excluded.contacted_leads,
        estimate_sent_leads = excluded.estimate_sent_leads,
        won_leads = excluded.won_leads,
        lost_leads = excluded.lost_leads,
        contact_conversion_rate = excluded.contact_conversion_rate,
        estimate_conversion_rate = excluded.estimate_conversion_rate,
        contract_conversion_rate = excluded.contract_conversion_rate,
        pipeline_amount = excluded.pipeline_amount,
        expected_win_amount = excluded.expected_win_amount,
        updated_at = excluded.updated_at
    `).run(
      `SALES-METRIC-${monthKey}`,
      monthKey,
      total,
      contacted,
      estimateSent,
      won,
      Number(stats?.lost_leads || 0),
      contactConversionRate,
      estimateConversionRate,
      contractConversionRate,
      Number(stats?.pipeline_amount || 0),
      Number(stats?.expected_win_amount || 0),
      now,
      now
    );
    return db.project.prepare('SELECT * FROM sales_pipeline_metrics WHERE month_key = ?').get(monthKey);
  }

  function logLeadActivity({ leadId, activityType, activityStatus = 'COMPLETED', memoKo, actor = 'BOC', createdAt = nowIso() }) {
    db.project.prepare(`
      INSERT INTO lead_activities (
        activity_id, lead_id, activity_type, activity_status, memo_ko, actor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LEAD-ACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      leadId,
      activityType,
      activityStatus,
      memoKo,
      actor,
      createdAt
    );
  }

  function insertNotification({ level = 'INFO', messageKo, relatedProjectId = 'PROFIT', actionKo = 'Profit Check', createdAt = nowIso() }) {
    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      level,
      messageKo,
      relatedProjectId,
      actionKo,
      createdAt
    );
  }

  function logProfitAutomationEvent({
    sourceModule,
    triggerEvent,
    entityType,
    entityId,
    decision,
    reason,
    beforeState = 'UNKNOWN',
    afterState = 'UNKNOWN',
    createdAt = nowIso()
  }) {
    const id = `PAE-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    db.project.prepare(`
      INSERT INTO profit_automation_events (
        id, source_module, trigger_event, entity_type, entity_id,
        decision, reason, before_state, after_state, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sourceModule,
      triggerEvent,
      entityType,
      entityId,
      decision,
      reason,
      typeof beforeState === 'string' ? beforeState : toJson(beforeState),
      typeof afterState === 'string' ? afterState : toJson(afterState),
      createdAt
    );
    return { id, sourceModule, triggerEvent, entityType, entityId, decision, reason, createdAt };
  }

  const automationRootCauseMap = {
    MATERIAL_PRICE_INCREASE: { nameKo: '자재 단가 상승', prevention: '해당 자재군 risk buffer를 상향합니다.' },
    LABOR_OVERRUN: { nameKo: '인건비 초과', prevention: '품수 기준과 생산성 계수를 보정합니다.' },
    SCHEDULE_DELAY: { nameKo: '공기 지연', prevention: '공정 여유일과 발주 리드타임을 상향합니다.' },
    DEFECT_REWORK: { nameKo: '하자 재작업', prevention: '검수 포인트와 재시공 예비비를 강화합니다.' },
    ESTIMATE_MISSING_ITEM: { nameKo: '견적 누락', prevention: '다음 견적 체크리스트에 필수 항목으로 추가합니다.' },
    VENDOR_PRICE_CHANGE: { nameKo: '거래처 단가 변동', prevention: '거래처 가격 이력과 승인 단가 기준을 재검토합니다.' },
    CLIENT_CHANGE_ORDER: { nameKo: '고객 추가 변경', prevention: '추가공사 승인 전 견적/수금 조건을 강제합니다.' },
    CREW_PRODUCTIVITY_DROP: { nameKo: '작업 생산성 저하', prevention: '팀별 생산성 기준과 배정 룰을 보정합니다.' },
    UNKNOWN: { nameKo: '원인 미분류', prevention: '대표 검토 후 원인을 확정합니다.' }
  };

  function normalizeAutomationRootCause(type) {
    const normalized = String(type || 'UNKNOWN').toUpperCase();
    return automationRootCauseMap[normalized] ? normalized : 'UNKNOWN';
  }

  function mapLegacyRootCauseToAutomation(type = '') {
    const source = String(type);
    if (source.includes('labor')) return 'LABOR_OVERRUN';
    if (source.includes('vendor')) return 'VENDOR_PRICE_CHANGE';
    if (source.includes('defect')) return 'DEFECT_REWORK';
    if (source.includes('estimate_missing') || source.includes('missing')) return 'ESTIMATE_MISSING_ITEM';
    if (source.includes('unit_price') || source.includes('accessory')) return 'MATERIAL_PRICE_INCREASE';
    return 'UNKNOWN';
  }

  function createAutomationRootCause({
    projectId,
    estimateId = null,
    rootCause,
    financialImpact = 0,
    recommendedPrevention = null,
    sourceLeak = null,
    createdAt = nowIso()
  }) {
    const normalized = normalizeAutomationRootCause(rootCause);
    const meta = automationRootCauseMap[normalized];
    const rootCauseId = `AUTO-RCA-${projectId}-${normalized}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO cost_leak_root_causes (
        root_cause_id, leak_id, project_id, requirement_id, process_id,
        cost_category, item_name_ko, root_cause_type, root_cause_name_ko,
        reason_ko, status, approval_required, case_library_link_json,
        evidence_json, created_at, updated_at, estimate_id, financial_impact, recommended_prevention
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rootCauseId,
      sourceLeak?.leak_id || `AUTO-LEAK-${projectId}-${normalized}`,
      projectId,
      sourceLeak?.requirement_id || 'AUTO',
      sourceLeak?.process_id || 'AUTO',
      sourceLeak?.cost_category || normalized,
      sourceLeak?.item_name_ko || meta.nameKo,
      normalized,
      meta.nameKo,
      `${meta.nameKo}: ${recommendedPrevention || meta.prevention}`,
      'CANDIDATE',
      1,
      toJson({ projectId, estimateId, automationLoop: true }),
      toJson({ financialImpact, sourceLeak }),
      createdAt,
      createdAt,
      estimateId,
      Math.round(Number(financialImpact || 0)),
      recommendedPrevention || meta.prevention
    );
    logProfitAutomationEvent({
      sourceModule: 'RootCauseLearning',
      triggerEvent: 'COST_LEAK_DETECTED',
      entityType: 'Project',
      entityId: projectId,
      decision: normalized,
      reason: recommendedPrevention || meta.prevention,
      beforeState: sourceLeak ? toJson(sourceLeak) : 'AUTO',
      afterState: rootCauseId,
      createdAt
    });
    syncRootCausePatterns(createdAt);
    return { rootCauseId, rootCause: normalized, rootCauseNameKo: meta.nameKo, financialImpact, recommendedPrevention: recommendedPrevention || meta.prevention };
  }

  function normalizeAreaM2(value) {
    const area = Number(value || 0);
    return Number.isFinite(area) && area > 0 ? area : 0;
  }

  function scoreLead({ estimatedBudget, areaM2, location = '', clientType = 'RESIDENTIAL' }) {
    let score = 0;
    const pricePerM2 = areaM2 > 0 ? estimatedBudget / areaM2 : 0;
    if (estimatedBudget >= PROFIT_POLICY.minimumBudget * 2) score += 35;
    else if (estimatedBudget >= PROFIT_POLICY.minimumBudget) score += 25;
    else score += 5;

    if (pricePerM2 >= PROFIT_POLICY.minimumPricePerM2 * 1.2) score += 35;
    else if (pricePerM2 >= PROFIT_POLICY.minimumPricePerM2) score += 25;
    else score += 5;

    if (String(location).includes('서울') || String(location).includes('경기')) score += 15;
    else if (location && location !== 'UNKNOWN') score += 10;

    if (clientType === 'COMMERCIAL' || clientType === 'DEVELOPER') score += 15;
    else score += 10;

    return Math.min(score, 100);
  }

  function runQualificationEngine({
    leadId,
    estimatedBudget = 0,
    areaM2 = 0,
    location = 'UNKNOWN',
    clientType = 'RESIDENTIAL',
    createdAt = nowIso()
  }) {
    const normalizedBudget = Number(estimatedBudget || 0);
    const normalizedArea = normalizeAreaM2(areaM2);
    const pricePerM2 = normalizedArea > 0 ? normalizedBudget / normalizedArea : 0;
    const score = scoreLead({ estimatedBudget: normalizedBudget, areaM2: normalizedArea, location, clientType });
    let decision = 'PASS';
    const reasons = [];

    if (normalizedBudget < PROFIT_POLICY.minimumBudget) {
      decision = 'FAIL';
      reasons.push(`estimated_budget below ${PROFIT_POLICY.minimumBudget}`);
    }
    if (normalizedArea <= 0) {
      decision = decision === 'FAIL' ? 'FAIL' : 'CONDITIONAL';
      reasons.push('area_m2 missing');
    } else if (pricePerM2 < PROFIT_POLICY.minimumPricePerM2) {
      decision = 'FAIL';
      reasons.push(`price_per_m2 below ${PROFIT_POLICY.minimumPricePerM2}`);
    }
    if (decision === 'PASS' && score < 70) {
      decision = 'CONDITIONAL';
      reasons.push('score below pass threshold');
    }

    const id = `QUAL-${leadId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO qualification_results (
        id, lead_id, score, decision, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      leadId,
      score,
      decision,
      reasons.length ? reasons.join('; ') : `PASS: price_per_m2=${Math.round(pricePerM2)}`,
      createdAt
    );
    logProfitAutomationEvent({
      sourceModule: 'QualificationEngine',
      triggerEvent: 'LEAD_CREATED_OR_UPDATED',
      entityType: 'Lead',
      entityId: leadId,
      decision,
      reason: reasons.length ? reasons.join('; ') : `PASS: price_per_m2=${Math.round(pricePerM2)}`,
      beforeState: toJson({ estimatedBudget: normalizedBudget, areaM2: normalizedArea, location, clientType }),
      afterState: toJson({ score, decision }),
      createdAt
    });
    return { id, leadId, score, decision, reason: reasons.join('; ') || 'PASS', estimatedPricePerM2: pricePerM2, createdAt };
  }

  function latestEstimateForLead(leadId) {
    const link = db.project.prepare(`
      SELECT * FROM lead_estimate_links
      WHERE lead_id = ?
      ORDER BY updated_at DESC, linked_at DESC
      LIMIT 1
    `).get(leadId);
    if (!link) return null;
    const estimateDraftId = link.estimate_draft_id || link.estimate_id;
    if (!estimateDraftId) return { link };
    const draft = db.project.prepare('SELECT * FROM estimate_drafts WHERE estimate_draft_id = ?').get(estimateDraftId);
    return { link, draft };
  }

  function runProfitControlEngine({
    estimateId,
    revenue = 0,
    totalCost = 0,
    vendorRisk = 0,
    laborVariance = 0,
    scheduleRisk = 0,
    defectRisk = 0,
    forceDecision = null,
    createdAt = nowIso()
  }) {
    const normalizedRevenue = Math.max(0, Math.round(Number(revenue || 0)));
    const normalizedTotalCost = Math.max(0, Math.round(Number(totalCost || 0)));
    const riskBuffer = Math.max(0, Math.round(Number(vendorRisk || 0) + Number(laborVariance || 0) + Number(scheduleRisk || 0) + Number(defectRisk || 0)));
    const realMargin = normalizedRevenue > 0
      ? Number(((normalizedRevenue - normalizedTotalCost - riskBuffer) / normalizedRevenue).toFixed(4))
      : 0;
    let decision = 'BLOCK';
    if (forceDecision) decision = forceDecision;
    else if (realMargin < PROFIT_POLICY.blockMarginRate) decision = 'BLOCK';
    else if (realMargin < PROFIT_POLICY.modifyMarginRate) decision = 'MODIFY';
    else if (realMargin < PROFIT_POLICY.goMarginRate) decision = 'GO';
    else decision = 'SCALE';

    const id = `PCE-${estimateId || 'NOEST'}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO profit_decisions (
        id, estimate_id, revenue, total_cost, risk_buffer, real_margin, decision, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      estimateId || 'UNKNOWN_ESTIMATE',
      normalizedRevenue,
      normalizedTotalCost,
      riskBuffer,
      realMargin,
      decision,
      createdAt
    );
    logProfitAutomationEvent({
      sourceModule: 'PCE',
      triggerEvent: 'ESTIMATE_PROFIT_VALIDATION',
      entityType: 'Estimate',
      entityId: estimateId || 'UNKNOWN_ESTIMATE',
      decision,
      reason: `real_margin=${realMargin}, risk_buffer=${riskBuffer}`,
      beforeState: toJson({ revenue: normalizedRevenue, totalCost: normalizedTotalCost }),
      afterState: toJson({ decision, realMargin, riskBuffer }),
      createdAt
    });
    if (decision === 'BLOCK') {
      syncAutoBlockRules(createdAt);
    }
    return { id, estimateId: estimateId || 'UNKNOWN_ESTIMATE', revenue: normalizedRevenue, totalCost: normalizedTotalCost, riskBuffer, realMargin, decision, createdAt };
  }

  function latestApprovedOverride(estimateId) {
    if (!estimateId) return null;
    return db.project.prepare(`
      SELECT * FROM decision_overrides
      WHERE estimate_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(estimateId);
  }

  function overrideProfitDecision({ estimateId, originalDecision, overrideDecision, reason, createdBy = 'CEO' }) {
    if (!estimateId || !overrideDecision || !reason) throw new Error('estimateId, overrideDecision, and reason are required');
    const createdAt = nowIso();
    const id = `PCE-OVERRIDE-${estimateId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO decision_overrides (
        id, estimate_id, original_decision, override_decision, reason, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, estimateId, originalDecision || 'UNKNOWN', overrideDecision, reason, createdBy, createdAt);
    insertNotification({
      level: overrideDecision === 'GO' || overrideDecision === 'SCALE' ? 'WARNING' : 'INFO',
      messageKo: `PCE override recorded: ${estimateId} ${originalDecision || 'UNKNOWN'} -> ${overrideDecision}`,
      relatedProjectId: estimateId,
      actionKo: 'PCE Override',
      createdAt
    });
    return { id, estimateId, originalDecision, overrideDecision, reason, createdBy, createdAt };
  }

  function calculateBathroomEstimatePreview(payload = {}) {
    const estimate = calculateBathroomEstimate(payload);
    const estimateId = payload.estimateId || `BATH-PREVIEW-${Date.now()}`;
    const pce = runProfitControlEngine({
      estimateId,
      revenue: estimate.revenue,
      totalCost: estimate.total_cost,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0
    });
    const pceLabelsKo = {
      BLOCK: '위험',
      MODIFY: '수정 필요',
      GO: '진행 가능',
      SCALE: '고마진 복제 대상'
    };
    const pceEstimate = {
      ...estimate,
      pce_decision: pce.decision,
      pce_label_ko: pceLabelsKo[pce.decision] || estimate.pce_label_ko
    };
    return {
      estimate: pceEstimate,
      pce,
      customerView: buildCustomerEstimateView(pceEstimate),
      internalView: buildInternalCostView(pceEstimate)
    };
  }

  function saveBathroomEstimate(payload = {}) {
    const createdAt = nowIso();
    const estimateId = payload.estimateId || `BATH-EST-${Date.now()}`;
    const calculated = calculateBathroomEstimate(payload);
    const pce = runProfitControlEngine({
      estimateId,
      revenue: calculated.revenue,
      totalCost: calculated.total_cost,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0,
      createdAt
    });

    if (pce.decision === 'BLOCK' && !payload.adminOverrideReason) {
      throw new Error('PCE BLOCK: 25% 미만 마진 견적은 저장 전 관리자 예외 승인 사유가 필요합니다.');
    }

    if (pce.decision === 'BLOCK' && payload.adminOverrideReason) {
      overrideProfitDecision({
        estimateId,
        originalDecision: 'BLOCK',
        overrideDecision: 'MODIFY',
        reason: payload.adminOverrideReason,
        createdBy: payload.actor || 'CEO'
      });
    }

    db.project.prepare(`
      INSERT OR REPLACE INTO bathroom_estimates (
        id, customer_name, site_name, bathroom_count, bathroom_area_m2, ceiling_height_mm,
        construction_method, waterproof_method, tile_wall_type, tile_floor_type, options_json,
        revenue, total_cost, expected_margin, expected_margin_rate, pce_decision, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      estimateId,
      calculated.input.customerName || 'UNKNOWN',
      calculated.input.siteName || 'UNKNOWN',
      calculated.input.bathroomCount,
      calculated.input.bathroomAreaM2,
      calculated.input.ceilingHeightMm,
      calculated.input.constructionMethod,
      calculated.input.waterproofMethod,
      calculated.input.tileWallType,
      calculated.input.tileFloorType,
      toJson(calculated.input.options),
      calculated.revenue,
      calculated.total_cost,
      calculated.expected_margin,
      calculated.expected_margin_rate,
      pce.decision,
      createdAt,
      createdAt
    );

    db.project.prepare('DELETE FROM bathroom_estimate_items WHERE estimate_id = ?').run(estimateId);
    const insertItem = db.project.prepare(`
      INSERT INTO bathroom_estimate_items (
        id, estimate_id, category, item_name, quantity, unit, customer_unit_price,
        customer_total, material_cost, labor_cost, subcontract_cost, internal_total, margin, margin_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    calculated.line_items.forEach((item, index) => {
      insertItem.run(
        `${estimateId}-ITEM-${String(index + 1).padStart(3, '0')}`,
        estimateId,
        item.category,
        item.itemName,
        item.quantity,
        item.unit,
        item.customerUnitPrice,
        item.customerTotal,
        item.materialCost,
        item.laborCost,
        item.subcontractCost,
        item.internalTotal,
        item.margin,
        item.marginRate
      );
    });

    insertNotification({
      level: pce.decision === 'BLOCK' ? 'RED' : pce.decision === 'MODIFY' ? 'WARNING' : 'INFO',
      messageKo: `욕실 견적 저장: ${estimateId} / PCE ${pce.decision} / 마진율 ${(calculated.expected_margin_rate * 100).toFixed(1)}%`,
      relatedProjectId: estimateId,
      actionKo: '욕실 견적 저장',
      createdAt
    });

    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACT-BATH-EST-${Date.now()}`,
      'SAVE_BATHROOM_ESTIMATE',
      payload.actor || 'CEO',
      estimateId,
      null,
      toJson({ pceDecision: pce.decision, revenue: calculated.revenue, totalCost: calculated.total_cost }),
      '욕실 자동견적 저장',
      createdAt
    );

    return {
      estimateId,
      pce,
      estimate: { ...calculated, pce_decision: pce.decision },
      customerView: buildCustomerEstimateView(calculated),
      internalView: buildInternalCostView({ ...calculated, pce_decision: pce.decision }),
      dashboardData: getDashboardData()
    };
  }

  function profitGateForWonLead({ lead, payload = {}, actor = 'CEO', createdAt = nowIso() }) {
    const estimate = latestEstimateForLead(lead.lead_id);
    const estimateDraftId = payload.estimateId || estimate?.draft?.estimate_draft_id || estimate?.link?.estimate_id || `EST-LEAD-${lead.lead_id}`;
    const draftPayload = fromJson(estimate?.draft?.preliminary_estimate_json, {});
    const marginSafety = draftPayload?.marginSafety || {};
    const revenue = Number(payload.revenue ?? marginSafety.customerOfferPrice ?? lead.expected_budget ?? 0);
    const totalCost = Number(payload.totalCost ?? marginSafety.estimatedCost ?? estimate?.draft?.estimated_cost ?? 0);
    const hasEnoughCostData = revenue > 0 && totalCost > 0;
    const pce = runProfitControlEngine({
      estimateId: estimateDraftId,
      revenue,
      totalCost: hasEnoughCostData ? totalCost : revenue,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0,
      forceDecision: hasEnoughCostData ? null : 'MODIFY',
      createdAt
    });
    const override = latestApprovedOverride(estimateDraftId);
    const effectiveDecision = override?.override_decision || pce.decision;
    const canCreateProject = effectiveDecision === 'GO' || effectiveDecision === 'SCALE';

    if (!canCreateProject) {
      const nextStatus = effectiveDecision === 'BLOCK' ? 'LOST' : 'ESTIMATE_SENT';
      const nextActionKo = effectiveDecision === 'BLOCK'
        ? 'PCE BLOCK: profit validation failed'
        : 'PCE MODIFY: estimate revision required';
      db.project.prepare(`
        UPDATE leads
        SET consultation_status = ?, next_action_ko = ?, lost_reason_required = ?, updated_at = ?
        WHERE lead_id = ?
      `).run(nextStatus, nextActionKo, effectiveDecision === 'BLOCK' ? 1 : 0, createdAt, lead.lead_id);
      logLeadActivity({
        leadId: lead.lead_id,
        activityType: `PCE_${effectiveDecision}`,
        memoKo: `${nextActionKo} / real_margin=${Math.round(pce.realMargin * 10000) / 100}%`,
        actor,
        createdAt
      });
      if (effectiveDecision === 'BLOCK') {
        db.project.prepare(`
          INSERT INTO lost_reason_logs (
            lost_reason_id, lead_id, reason_category, reason_ko, competitor_ko,
            lost_amount, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `LOST-PCE-${lead.lead_id}-${Date.now()}`,
          lead.lead_id,
          'LOW_MARGIN_BLOCKED',
          `PCE BLOCK: real margin ${Math.round(pce.realMargin * 10000) / 100}% is below 25%`,
          null,
          Number(lead.expected_budget || 0),
          actor,
          createdAt
        );
      }
      insertNotification({
        level: effectiveDecision === 'BLOCK' ? 'RED' : 'WARNING',
        messageKo: `${lead.customer_name_ko} PCE ${effectiveDecision}: 프로젝트 생성 차단`,
        relatedProjectId: lead.lead_id,
        actionKo: 'PCE',
        createdAt
      });
      return { allowed: false, pce, override, effectiveDecision };
    }

    logLeadActivity({
      leadId: lead.lead_id,
      activityType: `PCE_${effectiveDecision}`,
      memoKo: `PCE ${effectiveDecision}: 프로젝트 생성 허용 / real_margin=${Math.round(pce.realMargin * 10000) / 100}%`,
      actor,
      createdAt
    });
    return { allowed: true, pce, override, effectiveDecision };
  }

  function areaRangeFor(areaM2) {
    const area = normalizeAreaM2(areaM2);
    if (area <= 10) return '0-10';
    if (area <= 30) return '10-30';
    if (area <= 60) return '30-60';
    return '60+';
  }

  function createProfitTemplateFromCompletion({
    projectId,
    projectType = 'unknown',
    areaM2 = 0,
    actualCosts = {},
    actualDurationDays = 0,
    finalMarginRate = 0,
    defects = [],
    claims = [],
    reworkRequired = false,
    estimatedDurationDays = 0,
    createdAt = nowIso()
  }) {
    const normalizedMargin = Number(finalMarginRate || 0) / 100;
    const completedOnTime = Number(estimatedDurationDays || 0) > 0 && Number(actualDurationDays || 0) <= Number(estimatedDurationDays || 0);
    const cleanQuality = defects.length === 0 && claims.length === 0 && !reworkRequired;
    if (normalizedMargin < PROFIT_POLICY.goMarginRate || !completedOnTime || !cleanQuality) {
      return null;
    }
    const id = `PROFIT-TPL-${projectId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO profit_templates (
        id, project_type, area_range, cost_structure_json,
        crew_structure_json, duration, margin, created_at,
        location_ko, estimate_structure_json, schedule_structure_json,
        root_cause_summary_json, prevention_rules_applied_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      projectType,
      areaRangeFor(areaM2),
      toJson(actualCosts),
      toJson({ sourceProjectId: projectId, laborCost: actualCosts.laborCost || 0 }),
      Number(actualDurationDays || 0),
      normalizedMargin,
      createdAt,
      actualCosts.locationKo || 'UNKNOWN',
      toJson({ sourceProjectId: projectId, finalMarginRate, finalContractAmount: actualCosts.finalContractAmount || 0 }),
      toJson({ actualDurationDays, estimatedDurationDays, completedOnTime }),
      toJson(db.project.prepare('SELECT * FROM cost_leak_root_causes WHERE project_id = ?').all(projectId).map((row) => ({
        rootCauseType: row.root_cause_type,
        financialImpact: row.financial_impact || 0
      }))),
      toJson(db.project.prepare("SELECT * FROM prevention_rules WHERE status = 'ACTIVE' AND project_type = ?").all(projectType).map((row) => row.rule_id))
    );
    logProfitAutomationEvent({
      sourceModule: 'TemplateCreation',
      triggerEvent: 'PROJECT_COMPLETED',
      entityType: 'Project',
      entityId: projectId,
      decision: 'TEMPLATE_CREATED',
      reason: `final_margin ${finalMarginRate}% and clean completion`,
      beforeState: 'COMPLETED',
      afterState: id,
      createdAt
    });
    return { id, projectType, areaRange: areaRangeFor(areaM2), margin: normalizedMargin };
  }

  function matchProfitTemplateForEstimate({ estimateId, projectType = 'unknown', areaM2 = 0, apply = true, createdAt = nowIso() }) {
    if (!estimateId) return null;
    const areaRange = areaRangeFor(areaM2);
    const templates = db.project.prepare(`
      SELECT * FROM profit_templates
      WHERE project_type = ?
      ORDER BY margin DESC, created_at DESC
    `).all(projectType);
    if (templates.length === 0) return null;
    let best = null;
    templates.forEach((template) => {
      let score = 0.55;
      if (template.area_range === areaRange) score += 0.35;
      score += Math.min(Number(template.margin || 0), 0.5) * 0.2;
      if (!best || score > best.score) best = { template, score };
    });
    if (!best) return null;
    const id = `TPL-MATCH-${estimateId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO template_matches (
        id, estimate_id, template_id, match_score, applied, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, estimateId, best.template.id, Number(best.score.toFixed(4)), apply ? 1 : 0, createdAt);
    const recommendationId = `PTR-${estimateId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO profit_template_recommendations (
        id, estimate_id, template_id, match_score, expected_margin,
        risk_buffer_recommendation, recommendation_payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recommendationId,
      estimateId,
      best.template.id,
      Number(best.score.toFixed(4)),
      Number(best.template.margin || 0),
      Number(best.template.margin || 0) >= 0.35 ? 0 : Math.round(PROFIT_POLICY.minimumBudget * 0.03),
      toJson({
        projectType,
        areaRange,
        previousMargin: best.template.margin,
        suggestedCostStructure: fromJson(best.template.cost_structure_json, {}),
        suggestedCrewStructure: fromJson(best.template.crew_structure_json, {}),
        suggestedScheduleStructure: fromJson(best.template.schedule_structure_json, {}),
        riskBufferRecommendationKo: '고마진 템플릿 기준 원가 구조를 우선 적용합니다.'
      }),
      createdAt
    );
    logProfitAutomationEvent({
      sourceModule: 'TemplateRecommendation',
      triggerEvent: 'ESTIMATE_CREATED',
      entityType: 'Estimate',
      entityId: estimateId,
      decision: 'RECOMMENDED',
      reason: `Matched profit template ${best.template.id}`,
      beforeState: 'NO_TEMPLATE',
      afterState: recommendationId,
      createdAt
    });
    return { id, recommendationId, estimateId, templateId: best.template.id, matchScore: Number(best.score.toFixed(4)), applied: Boolean(apply) };
  }

  function syncAutoBlockRules(createdAt = nowIso()) {
    const rules = [];
    const lowMarginDecisions = db.project.prepare(`
      SELECT decision.*, draft.lead_id, leads.client_type, leads.location_ko, leads.interested_scope
      FROM profit_decisions decision
      LEFT JOIN estimate_drafts draft ON draft.estimate_draft_id = decision.estimate_id
      LEFT JOIN leads ON leads.lead_id = draft.lead_id
      WHERE decision.real_margin < ?
    `).all(PROFIT_POLICY.blockMarginRate);
    const counters = new Map();
    lowMarginDecisions.forEach((row) => {
      let enriched = row;
      if (!row.client_type && String(row.estimate_id || '').startsWith('EST-LEAD-')) {
        const leadId = String(row.estimate_id).replace(/^EST-LEAD-/, '');
        const lead = db.project.prepare('SELECT * FROM leads WHERE lead_id = ?').get(leadId);
        if (lead) {
          enriched = {
            ...row,
            client_type: lead.client_type,
            location_ko: lead.location_ko,
            interested_scope: lead.interested_scope
          };
        }
      }
      [
        ['CLIENT_TYPE', enriched.client_type],
        ['REGION', enriched.location_ko],
        ['PROJECT_TYPE', enriched.interested_scope]
      ].forEach(([ruleType, value]) => {
        if (!value) return;
        const key = `${ruleType}:${value}`;
        counters.set(key, { ruleType, value, count: (counters.get(key)?.count || 0) + 1 });
      });
    });
    counters.forEach((item) => {
      if (item.count < 2) return;
      const id = `ABR-${item.ruleType}-${String(item.value).replace(/[^A-Za-z0-9_-]/g, '_')}`;
      const decision = item.count >= 3 ? 'BLOCK' : 'WARN';
      const riskBufferAdjustment = item.count >= 3 ? Math.round(PROFIT_POLICY.minimumBudget * 0.05) : Math.round(PROFIT_POLICY.minimumBudget * 0.03);
      db.project.prepare(`
        INSERT OR REPLACE INTO auto_block_rules (
          id, rule_type, target_key, occurrence_count, risk_buffer_adjustment,
          decision, reason, override_allowed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM auto_block_rules WHERE id = ?), ?), ?)
      `).run(
        id,
        item.ruleType,
        String(item.value),
        item.count,
        riskBufferAdjustment,
        decision,
        `${item.ruleType} ${item.value}에서 25% 미만 저마진 패턴이 ${item.count}회 반복되었습니다.`,
        1,
        id,
        createdAt,
        createdAt
      );
      rules.push({ id, ruleType: item.ruleType, targetKey: item.value, occurrenceCount: item.count, decision, riskBufferAdjustment });
      logProfitAutomationEvent({
        sourceModule: 'LowMarginAutoBlock',
        triggerEvent: 'REPEATED_LOW_MARGIN_PATTERN',
        entityType: item.ruleType,
        entityId: String(item.value),
        decision,
        reason: `${item.count} repeated low-margin decisions`,
        beforeState: 'MONITORING',
        afterState: id,
        createdAt
      });
    });
    return rules;
  }

  function getAutoBlockRiskForLead(lead) {
    const rules = db.project.prepare(`
      SELECT *
      FROM auto_block_rules
      WHERE decision IN ('WARN', 'BLOCK')
      ORDER BY occurrence_count DESC, updated_at DESC
    `).all();
    return rules.filter((rule) => (
      (rule.rule_type === 'CLIENT_TYPE' && rule.target_key === lead.client_type) ||
      (rule.rule_type === 'REGION' && rule.target_key === lead.location_ko) ||
      (rule.rule_type === 'PROJECT_TYPE' && rule.target_key === lead.interested_scope)
    ));
  }

  function createLead(payload = {}) {
    const createdAt = nowIso();
    const leadId = payload.leadId || `LEAD-${Date.now()}`;
    const customerNameKo = payload.customerNameKo || payload.customerName || '??? ??';
    const contactPhone = payload.contactPhone || payload.contact || 'UNKNOWN';
    const sourceChannel = payload.sourceChannel || 'NAVER';
    const interestedScope = payload.interestedScope || 'bathroom';
    const expectedBudget = Number(payload.expectedBudget || 0);
    const areaM2 = normalizeAreaM2(payload.areaM2 || payload.area_m2);
    const locationKo = payload.locationKo || payload.location || 'UNKNOWN';
    const clientType = payload.clientType || 'RESIDENTIAL';
    const consultationMemoKo = payload.consultationMemoKo || payload.memoKo || '?? ?? ???';
    const actor = payload.actor || 'CEO';
    const qualification = runQualificationEngine({
      leadId,
      estimatedBudget: expectedBudget,
      areaM2,
      location: locationKo,
      clientType,
      createdAt
    });
    const initialStatus = qualification.decision === 'FAIL' ? 'LOST' : 'NEW';
    db.project.prepare(`
      INSERT INTO leads (
        lead_id, customer_name_ko, contact_phone, source_channel, consultation_status,
        interested_scope, expected_budget, consultation_memo_ko, assigned_owner,
        next_action_ko, lost_reason_required, created_at, updated_at,
        area_m2, location_ko, client_type, qualification_decision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      customerNameKo,
      contactPhone,
      sourceChannel,
      initialStatus,
      interestedScope,
      expectedBudget,
      consultationMemoKo,
      payload.assignedOwner || 'Estimator',
      qualification.decision === 'FAIL' ? 'Qualification FAIL: ??/?? ?? ??' : '24?? ? 1? ??',
      qualification.decision === 'FAIL' ? 1 : 0,
      createdAt,
      createdAt,
      areaM2,
      locationKo,
      clientType,
      qualification.decision
    );
    logLeadActivity({ leadId, activityType: 'LEAD_CREATED', memoKo: '?? ?? ??', actor, createdAt });
    logLeadActivity({ leadId, activityType: `QUALIFICATION_${qualification.decision}`, memoKo: `Qualification ${qualification.decision}: score=${qualification.score}, ${qualification.reason}`, actor: 'BOC', createdAt });
    if (qualification.decision === 'FAIL') {
      db.project.prepare(`
        INSERT INTO lost_reason_logs (
          lost_reason_id, lead_id, reason_category, reason_ko, competitor_ko,
          lost_amount, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LOST-QUAL-${leadId}-${Date.now()}`,
        leadId,
        'QUALIFICATION_FAIL',
        `Qualification FAIL: ${qualification.reason}`,
        null,
        expectedBudget,
        'BOC',
        createdAt
      );
    }
    insertNotification({
      level: qualification.decision === 'FAIL' ? 'RED' : qualification.decision === 'CONDITIONAL' ? 'WARNING' : 'INFO',
      messageKo: `Qualification ${qualification.decision}: ${customerNameKo} / score ${qualification.score}`,
      relatedProjectId: leadId,
      actionKo: 'Qualification',
      createdAt
    });
    syncSalesPipelineMetrics();
    return { lead: mapLead(db.project.prepare('SELECT * FROM leads WHERE lead_id = ?').get(leadId)), qualification, salesData: getSalesPipelineData() };
  }

  function createProjectFromWonLead(lead, actor = 'CEO') {
    const createdAt = nowIso();
    const projectId = `PRJ-WON-${lead.lead_id.replace(/^LEAD-/, '')}`;
    const exists = db.project.prepare('SELECT project_id FROM projects WHERE project_id = ?').get(projectId);
    if (!exists) {
      db.project.prepare(`
        INSERT INTO projects (
          project_id, project_name_ko, current_process_ko, today_tasks_json,
          deadline, risk_score, risk_level, profit_rate, receivable_amount,
          progress_rate, remaining_days, receivable_status_ko, defect_risk_ko,
          next_action_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        `${lead.customer_name_ko} ${scopeLabelKo(lead.interested_scope)} 프로젝트`,
        'PRELIMINARY',
        toJson(['Estimate Wizard 실행', '현장 조건 확인', '계약/수금 조건 확인']),
        '미정',
        45,
        'MEDIUM',
        '예비',
        'UNKNOWN',
        '0%',
        0,
        '계약 조건 확인 필요',
        '미확인',
        '예비 견적 생성',
        createdAt,
        createdAt
      );
    }
    db.project.prepare(`
      INSERT INTO lead_estimate_links (
        link_id, lead_id, estimate_draft_id, estimate_id, project_id,
        estimate_status, linked_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LEAD-LINK-${lead.lead_id}-PROJECT`,
      lead.lead_id,
      null,
      null,
      projectId,
      'PROJECT_CREATED',
      createdAt,
      createdAt
    );
    logLeadActivity({ leadId: lead.lead_id, activityType: 'PROJECT_CREATED', memoKo: `WON 전환으로 ${projectId} 생성`, actor, createdAt });
    const clientId = createClientFromLead(lead, projectId, createdAt);
    const contractId = createContractDraft({
      clientId,
      projectId,
      leadId: lead.lead_id,
      contractAmount: Number(lead.expected_budget || 0),
      actor,
      createdAt
    });
    return { projectId, clientId, contractId };
  }

  function updateLeadStatus(payload = {}) {
    const leadId = payload.leadId;
    const nextStatus = payload.nextStatus;
    const actor = payload.actor || 'CEO';
    if (!leadId || !nextStatus) throw new Error('leadId and nextStatus are required');
    const lead = db.project.prepare('SELECT * FROM leads WHERE lead_id = ?').get(leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);
    if (nextStatus === 'LOST' && !payload.lostReasonKo) {
      throw new Error('LOST requires lostReasonKo');
    }
    const updatedAt = nowIso();

    if (nextStatus === 'WON') {
      const gate = profitGateForWonLead({ lead, payload, actor, createdAt: updatedAt });
      let project = null;
      if (gate.allowed) {
        db.project.prepare(`
          UPDATE leads
          SET consultation_status = ?, next_action_ko = ?, lost_reason_required = ?, qualification_decision = CASE WHEN qualification_decision = 'FAIL' THEN 'CONDITIONAL' ELSE qualification_decision END, updated_at = ?
          WHERE lead_id = ?
        `).run(
          'WON',
          `PCE ${gate.effectiveDecision}: ???? ?? ??`,
          0,
          updatedAt,
          leadId
        );
        project = createProjectFromWonLead({ ...lead, consultation_status: 'WON' }, actor);
        insertNotification({
          level: gate.effectiveDecision === 'SCALE' ? 'INFO' : 'INFO',
          messageKo: `PCE ${gate.effectiveDecision}: ${lead.customer_name_ko} ???? ??`,
          relatedProjectId: project.projectId,
          actionKo: 'Project Created',
          createdAt: updatedAt
        });
      }
      syncSalesPipelineMetrics();
      return {
        lead: mapLead(db.project.prepare('SELECT * FROM leads WHERE lead_id = ?').get(leadId)),
        project,
        profitDecision: gate.pce,
        effectiveDecision: gate.effectiveDecision,
        salesData: getSalesPipelineData()
      };
    }

    db.project.prepare(`
      UPDATE leads
      SET consultation_status = ?, next_action_ko = ?, lost_reason_required = ?, updated_at = ?
      WHERE lead_id = ?
    `).run(
      nextStatus,
      payload.nextActionKo || `${leadStatusLabelKo(nextStatus)} next action`,
      nextStatus === 'LOST' ? 1 : 0,
      updatedAt,
      leadId
    );
    logLeadActivity({ leadId, activityType: `STATUS_${nextStatus}`, memoKo: payload.reasonKo || `Status changed to ${nextStatus}`, actor, createdAt: updatedAt });
    if (nextStatus === 'LOST') {
      db.project.prepare(`
        INSERT INTO lost_reason_logs (
          lost_reason_id, lead_id, reason_category, reason_ko, competitor_ko,
          lost_amount, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LOST-${leadId}-${Date.now()}`,
        leadId,
        payload.reasonCategory || 'UNSPECIFIED',
        payload.lostReasonKo,
        payload.competitorKo || null,
        Number(lead.expected_budget || 0),
        actor,
        updatedAt
      );
    }
    syncSalesPipelineMetrics();
    return { lead: mapLead(db.project.prepare('SELECT * FROM leads WHERE lead_id = ?').get(leadId)), project: null, salesData: getSalesPipelineData() };
  }

  function linkLeadToEstimate({ leadId, estimateDraftId, estimateId = null, projectId = null, estimateStatus = 'PRELIMINARY' }) {
    if (!leadId) return null;
    const now = nowIso();
    const linkId = `LEAD-LINK-${leadId}-${estimateDraftId || estimateId || projectId || Date.now()}`;
    db.project.prepare(`
      INSERT INTO lead_estimate_links (
        link_id, lead_id, estimate_draft_id, estimate_id, project_id,
        estimate_status, linked_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(linkId, leadId, estimateDraftId, estimateId, projectId, estimateStatus, now, now);
    db.project.prepare(`
      UPDATE leads
      SET consultation_status = CASE
        WHEN consultation_status IN ('NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'VISITED') THEN 'ESTIMATE_SENT'
        ELSE consultation_status
      END,
      next_action_ko = '견적 발송 후 후속 상담',
      updated_at = ?
      WHERE lead_id = ?
    `).run(now, leadId);
    logLeadActivity({ leadId, activityType: 'ESTIMATE_LINKED', memoKo: `견적 연결: ${estimateDraftId || estimateId || projectId}`, actor: 'BOC', createdAt: now });
    syncSalesPipelineMetrics();
    return linkId;
  }

  function mapLead(row) {
    if (!row) return null;
    return {
      leadId: row.lead_id,
      customerNameKo: row.customer_name_ko,
      contactPhone: row.contact_phone,
      sourceChannel: row.source_channel,
      consultationStatus: row.consultation_status,
      statusLabelKo: leadStatusLabelKo(row.consultation_status),
      interestedScope: row.interested_scope,
      interestedScopeKo: scopeLabelKo(row.interested_scope),
      expectedBudget: row.expected_budget,
      areaM2: row.area_m2,
      locationKo: row.location_ko,
      clientType: row.client_type,
      qualificationDecision: row.qualification_decision,
      consultationMemoKo: row.consultation_memo_ko,
      assignedOwner: row.assigned_owner,
      nextActionKo: row.next_action_ko,
      lostReasonRequired: Boolean(row.lost_reason_required),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function getSalesPipelineData() {
    const metric = syncSalesPipelineMetrics();
    const latestQualificationByLead = new Map(db.project.prepare(`
      SELECT q.*
      FROM qualification_results q
      JOIN (
        SELECT lead_id, MAX(created_at) AS created_at
        FROM qualification_results
        GROUP BY lead_id
      ) latest ON latest.lead_id = q.lead_id AND latest.created_at = q.created_at
    `).all().map((row) => [row.lead_id, row]));
    const leads = db.project.prepare('SELECT * FROM leads ORDER BY updated_at DESC, created_at DESC').all()
      .map((row) => {
        const lead = mapLead(row);
        const qualification = latestQualificationByLead.get(row.lead_id);
        const pricePerM2 = normalizeAreaM2(row.area_m2) > 0 ? Number(row.expected_budget || 0) / normalizeAreaM2(row.area_m2) : 0;
        const moneyScore = Number(qualification?.score || 0)
          + (pricePerM2 >= PROFIT_POLICY.minimumPricePerM2 ? 20 : 0)
          + (Number(row.expected_budget || 0) >= PROFIT_POLICY.minimumBudget * 2 ? 20 : 0)
          - (row.consultation_status === 'LOST' ? 100 : 0);
        return { ...lead, qualificationScore: Number(qualification?.score || 0), estimatedPricePerM2: pricePerM2, moneyPriorityScore: moneyScore };
      })
      .sort((a, b) => Number(b.moneyPriorityScore || 0) - Number(a.moneyPriorityScore || 0));
    const funnel = ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'VISITED', 'ESTIMATE_SENT', 'NEGOTIATING', 'WON', 'LOST'].map((status) => ({
      status,
      labelKo: leadStatusLabelKo(status),
      count: leads.filter((lead) => lead.consultationStatus === status).length,
      amount: leads.filter((lead) => lead.consultationStatus === status).reduce((sum, lead) => sum + Number(lead.expectedBudget || 0), 0)
    }));
    const activities = db.project.prepare('SELECT * FROM lead_activities ORDER BY created_at DESC LIMIT 30').all().map((row) => ({
      activityId: row.activity_id,
      leadId: row.lead_id,
      activityType: row.activity_type,
      activityStatus: row.activity_status,
      memoKo: row.memo_ko,
      actor: row.actor,
      createdAt: row.created_at
    }));
    const links = db.project.prepare('SELECT * FROM lead_estimate_links ORDER BY updated_at DESC').all().map((row) => ({
      linkId: row.link_id,
      leadId: row.lead_id,
      estimateDraftId: row.estimate_draft_id,
      estimateId: row.estimate_id,
      projectId: row.project_id,
      estimateStatus: row.estimate_status,
      linkedAt: row.linked_at,
      updatedAt: row.updated_at
    }));
    const lostReasons = db.project.prepare('SELECT * FROM lost_reason_logs ORDER BY created_at DESC').all().map((row) => ({
      lostReasonId: row.lost_reason_id,
      leadId: row.lead_id,
      reasonCategory: row.reason_category,
      reasonKo: row.reason_ko,
      competitorKo: row.competitor_ko,
      lostAmount: row.lost_amount,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));
    const qualificationResults = db.project.prepare('SELECT * FROM qualification_results ORDER BY created_at DESC LIMIT 50').all().map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      score: row.score,
      decision: row.decision,
      reason: row.reason,
      createdAt: row.created_at
    }));
    const profitDecisions = db.project.prepare('SELECT * FROM profit_decisions ORDER BY created_at DESC LIMIT 50').all().map((row) => ({
      id: row.id,
      estimateId: row.estimate_id,
      revenue: row.revenue,
      totalCost: row.total_cost,
      riskBuffer: row.risk_buffer,
      realMargin: row.real_margin,
      decision: row.decision,
      createdAt: row.created_at
    }));
    const templateMatches = db.project.prepare('SELECT * FROM template_matches ORDER BY created_at DESC LIMIT 50').all().map((row) => ({
      id: row.id,
      estimateId: row.estimate_id,
      templateId: row.template_id,
      matchScore: row.match_score,
      applied: Boolean(row.applied),
      createdAt: row.created_at
    }));
    const channelRows = db.project.prepare(`
      SELECT
        source_channel,
        COUNT(*) AS total_count,
        SUM(CASE WHEN consultation_status = 'WON' THEN 1 ELSE 0 END) AS won_count,
        SUM(CASE WHEN consultation_status = 'LOST' THEN 1 ELSE 0 END) AS lost_count,
        SUM(expected_budget) AS expected_budget
      FROM leads
      GROUP BY source_channel
      ORDER BY expected_budget DESC
    `).all();
    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      metrics: {
        monthKey: metric.month_key,
        totalLeads: metric.total_leads,
        contactedLeads: metric.contacted_leads,
        estimateSentLeads: metric.estimate_sent_leads,
        wonLeads: metric.won_leads,
        lostLeads: metric.lost_leads,
        contactConversionRate: metric.contact_conversion_rate,
        estimateConversionRate: metric.estimate_conversion_rate,
        contractConversionRate: metric.contract_conversion_rate,
        pipelineAmount: metric.pipeline_amount,
        expectedWinAmount: metric.expected_win_amount
      },
      leads,
      funnel,
      activities,
      estimateLinks: links,
      lostReasons,
      qualificationResults,
      profitDecisions,
      templateMatches,
      channelPerformance: channelRows.map((row) => ({
        sourceChannel: row.source_channel,
        totalCount: row.total_count,
        wonCount: row.won_count,
        lostCount: row.lost_count,
        expectedBudget: row.expected_budget,
        winRate: Number(row.total_count || 0) > 0 ? Number(row.won_count || 0) / Number(row.total_count || 0) : 0
      }))
    };
  }

  function getProfitGenerationData() {
    const summary = getProfitGenerationSummary();
    const automationDashboard = getProfitAutomationDashboardData();
    return {
      policy: PROFIT_POLICY,
      summary,
      automationDashboard,
      qualificationResults: db.project.prepare('SELECT * FROM qualification_results ORDER BY created_at DESC LIMIT 100').all(),
      profitDecisions: db.project.prepare('SELECT * FROM profit_decisions ORDER BY created_at DESC LIMIT 100').all(),
      profitTemplates: db.project.prepare('SELECT * FROM profit_templates ORDER BY margin DESC, created_at DESC LIMIT 100').all().map((row) => ({
        ...row,
        cost_structure: fromJson(row.cost_structure_json, {}),
        crew_structure: fromJson(row.crew_structure_json, {})
      })),
      templateMatches: db.project.prepare('SELECT * FROM template_matches ORDER BY created_at DESC LIMIT 100').all(),
      decisionOverrides: db.project.prepare('SELECT * FROM decision_overrides ORDER BY created_at DESC LIMIT 100').all()
    };
  }

  function getProfitAutomationDashboardData() {
    syncPreventionRulesFromRootCauses(nowIso());
    syncAutoBlockRules(nowIso());
    const pceCounts = db.project.prepare(`
      SELECT decision, COUNT(*) AS count
      FROM profit_decisions
      GROUP BY decision
    `).all().reduce((acc, row) => ({ ...acc, [row.decision]: row.count }), {});
    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      leadQualificationStatus: db.project.prepare(`
        SELECT decision, COUNT(*) AS count
        FROM qualification_results
        GROUP BY decision
      `).all(),
      pceStatus: pceCounts,
      liveMarginRiskProjects: db.project.prepare(`
        SELECT * FROM live_margin_events
        ORDER BY created_at DESC
        LIMIT 20
      `).all(),
      costLeakRootCauses: db.project.prepare(`
        SELECT * FROM cost_leak_root_causes
        ORDER BY updated_at DESC
        LIMIT 30
      `).all(),
      preventionRules: db.project.prepare(`
        SELECT * FROM prevention_rules
        WHERE status = 'ACTIVE'
        ORDER BY occurrence_count DESC, updated_at DESC
        LIMIT 30
      `).all(),
      autoBlockRules: db.project.prepare(`
        SELECT * FROM auto_block_rules
        ORDER BY occurrence_count DESC, updated_at DESC
        LIMIT 30
      `).all(),
      highMarginTemplates: db.project.prepare(`
        SELECT * FROM profit_templates
        ORDER BY margin DESC, created_at DESC
        LIMIT 20
      `).all(),
      templateRecommendations: db.project.prepare(`
        SELECT * FROM profit_template_recommendations
        ORDER BY created_at DESC
        LIMIT 30
      `).all(),
      automationLogs: db.project.prepare(`
        SELECT * FROM profit_automation_events
        ORDER BY created_at DESC
        LIMIT 80
      `).all()
    };
  }

  function getProfitGenerationSummary() {
    const monthStart = `${currentMonthKey()}-01T00:00:00.000Z`;
    const decisions = db.project.prepare('SELECT * FROM profit_decisions WHERE created_at >= ? ORDER BY created_at DESC').all(monthStart);
    const allTemplates = db.project.prepare('SELECT * FROM profit_templates ORDER BY margin DESC, created_at DESC').all();
    const monthlyExpectedNetProfit = decisions
      .filter((row) => row.decision === 'GO' || row.decision === 'SCALE')
      .reduce((sum, row) => sum + (Number(row.revenue || 0) - Number(row.total_cost || 0) - Number(row.risk_buffer || 0)), 0);
    const lossDefenseAmount = decisions
      .filter((row) => row.decision === 'BLOCK')
      .reduce((sum, row) => {
        const minimumProfit = Number(row.revenue || 0) * PROFIT_POLICY.blockMarginRate;
        const actualProfit = Number(row.revenue || 0) - Number(row.total_cost || 0) - Number(row.risk_buffer || 0);
        return sum + Math.max(0, minimumProfit - actualProfit);
      }, 0);
    const lowMarginProjectCount = decisions.filter((row) => row.decision === 'BLOCK' || row.decision === 'MODIFY').length;
    const blockedEstimateCount = decisions.filter((row) => row.decision === 'BLOCK').length;
    const averageRealMargin = decisions.length
      ? decisions.reduce((sum, row) => sum + Number(row.real_margin || 0), 0) / decisions.length
      : 0;
    return {
      monthKey: currentMonthKey(),
      monthlyExpectedNetProfit,
      lossDefenseAmount,
      lowMarginProjectCount,
      blockedEstimateCount,
      averageRealMargin,
      scalableTemplateCount: allTemplates.filter((row) => Number(row.margin || 0) >= PROFIT_POLICY.goMarginRate).length,
      totalTemplateCount: allTemplates.length
    };
  }

  function seedClientContractLayer() {
    if (countRows(db.project, 'clients') > 0) return;
    const createdAt = nowIso();
    const clientId = 'CLIENT-PRJ-PROD-BATH-0001';
    const contractId = 'CONTRACT-PRJ-PROD-BATH-0001';
    db.project.prepare(`
      INSERT INTO clients (
        client_id, lead_id, customer_name_ko, contact_phone, site_address_ko,
        consultation_history_json, estimate_history_json, contract_history_json,
        claim_history_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clientId,
      null,
      '욕실 운영 프로젝트 고객',
      'UNKNOWN',
      '구축 아파트 현장 주소 미입력',
      toJson([{ type: 'projectSeed', memoKo: '첫 운영 프로젝트 기준 고객 마스터 생성', createdAt }]),
      toJson([{ projectId: 'PRJ-PROD-BATH-0001', amount: 5490000, status: 'FINAL_ESTIMATE' }]),
      toJson([{ contractId, status: 'APPROVED' }]),
      toJson([]),
      createdAt,
      createdAt
    );
    createContractDraft({
      clientId,
      projectId: 'PRJ-PROD-BATH-0001',
      leadId: null,
      contractId,
      contractAmount: 5490000,
      autoApprove: true,
      actor: 'CEO',
      createdAt
    });
  }

  function createClientFromLead(lead, projectId, createdAt = nowIso()) {
    const clientId = `CLIENT-${lead.lead_id.replace(/^LEAD-/, '')}`;
    const exists = db.project.prepare('SELECT * FROM clients WHERE client_id = ?').get(clientId);
    if (!exists) {
      db.project.prepare(`
        INSERT INTO clients (
          client_id, lead_id, customer_name_ko, contact_phone, site_address_ko,
          consultation_history_json, estimate_history_json, contract_history_json,
          claim_history_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        clientId,
        lead.lead_id,
        lead.customer_name_ko,
        lead.contact_phone,
        '현장 주소 확인 필요',
        toJson([{ type: 'leadWon', leadId: lead.lead_id, memoKo: lead.consultation_memo_ko, createdAt }]),
        toJson([{ leadId: lead.lead_id, projectId, expectedBudget: lead.expected_budget, status: 'PRELIMINARY' }]),
        toJson([]),
        toJson([]),
        createdAt,
        createdAt
      );
    }
    return clientId;
  }

  function createContractDraft({
    clientId,
    projectId,
    leadId = null,
    contractId = null,
    contractAmount = 0,
    autoApprove = false,
    actor = 'BOC',
    createdAt = nowIso()
  }) {
    const resolvedContractId = contractId || `CONTRACT-${projectId}`;
    const exists = db.project.prepare('SELECT * FROM contracts WHERE contract_id = ?').get(resolvedContractId);
    if (!exists) {
      db.project.prepare(`
        INSERT INTO contracts (
          contract_id, client_id, project_id, lead_id, contract_status,
          contract_amount, deposit_rate, interim_rate, balance_rate,
          scope_summary_ko, exclusions_ko, change_order_terms_ko,
          defect_warranty_terms_ko, approval_required, approved_by, approved_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        resolvedContractId,
        clientId,
        projectId,
        leadId,
        autoApprove ? 'APPROVED' : 'DRAFT',
        Number(contractAmount || 0),
        0.3,
        0.4,
        0.3,
        '공사 범위는 확정 견적서와 공사 범위 확인서를 기준으로 한다.',
        '견적서에 명시되지 않은 철거, 보강, 추가 옵션, 고객 변심 항목은 제외한다.',
        '추가공사는 고객 서면 승인과 대표 승인 후 별도 견적/수금/공정표에 반영한다.',
        '하자보증은 공사 범위와 사용 조건에 따라 별도 명시하며 누수/작동 불량은 검수 기록을 기준으로 한다.',
        autoApprove ? 0 : 1,
        autoApprove ? actor : null,
        autoApprove ? createdAt : null,
        createdAt,
        createdAt
      );
    }
    createDefaultContractDocuments({ contractId: resolvedContractId, projectId, createdAt, autoApprove });
    if (!autoApprove) {
      createContractApprovalRequest({ contractId: resolvedContractId, projectId, createdAt });
    }
    return resolvedContractId;
  }

  function createDefaultContractDocuments({ contractId, projectId, createdAt = nowIso(), autoApprove = false }) {
    const documents = [
      ['CUSTOMER_ESTIMATE', '고객용 견적서', 'customer', '견적 금액, 포함 항목, 옵션, 수금 조건'],
      ['CONTRACT', '계약서', 'customer', '계약 당사자, 공사 금액, 수금 조건, 하자보증 조건'],
      ['SCOPE_CONFIRMATION', '공사 범위 확인서', 'customer', '포함 공정과 제외 항목 명세'],
      ['CHANGE_ORDER_APPROVAL', '추가공사 승인서', 'customer', '추가공사 발생 시 별도 승인'],
      ['CLIENT_HANDOVER', '고객 인도 확인서', 'customer', '준공 인도 및 잔금 확인'],
      ['DEFECT_RECEIPT', '하자 접수서', 'customer', '준공 후 하자 접수 및 처리 기록'],
      ['INTERNAL_CONTRACT_REVIEW', '내부 계약 검토표', 'internal', '마진, 리스크, 제외 항목 내부 검토']
    ];
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO contract_documents (
        document_id, contract_id, project_id, document_type, display_name_ko,
        audience, document_status, payload_json, approval_required, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const log = db.project.prepare(`
      INSERT OR IGNORE INTO client_document_logs (
        client_document_log_id, client_id, contract_id, project_id, document_id,
        action_type, audience, message_ko, created_at
      ) VALUES (?, (SELECT client_id FROM contracts WHERE contract_id = ?), ?, ?, ?, ?, ?, ?, ?)
    `);
    documents.forEach(([type, displayNameKo, audience, descriptionKo]) => {
      const documentId = `DOC-${contractId}-${type}`;
      insert.run(
        documentId,
        contractId,
        projectId,
        type,
        displayNameKo,
        audience,
        autoApprove && type === 'CONTRACT' ? 'APPROVED' : 'DRAFT',
        toJson({ descriptionKo, projectId, contractId, customerVisible: audience === 'customer', internalOnly: audience === 'internal' }),
        type === 'CONTRACT' ? 1 : 0,
        createdAt,
        createdAt
      );
      log.run(
        `CLIENT-DOC-LOG-${documentId}`,
        contractId,
        contractId,
        projectId,
        documentId,
        'GENERATED',
        audience,
        `${displayNameKo} 생성`,
        createdAt
      );
    });
  }

  function createContractApprovalRequest({ contractId, projectId, createdAt = nowIso() }) {
    const approvalId = `APP-${contractId}-ISSUE`;
    const exists = db.approval.prepare('SELECT approval_id FROM approvals WHERE approval_id = ?').get(approvalId);
    if (exists) return approvalId;
    db.approval.prepare(`
      INSERT INTO approvals (
        approval_id, project_id, approval_type, title_ko, reason_ko, status,
        rollback_required, rollback_status, blocking_impact_ko, requested_by,
        requested_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      approvalId,
      projectId,
      'Exception',
      '계약서 발행 전 대표 승인',
      '계약서, 공사 범위, 제외 항목, 추가공사 조건, 하자보증 조건을 확인해야 합니다.',
      'PENDING_CEO_APPROVAL',
      1,
      'READY',
      '승인 전 계약서 발행 및 EXECUTION_READY 전환 금지',
      'BOC',
      createdAt,
      createdAt
    );
    return approvalId;
  }

  function getApprovedContractForProject(projectId) {
    return db.project.prepare(`
      SELECT *
      FROM contracts
      WHERE project_id = ? AND contract_status = 'APPROVED'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(projectId);
  }

  function getClientContractData() {
    seedClientContractLayer();
    const clients = db.project.prepare('SELECT * FROM clients ORDER BY updated_at DESC').all().map((row) => ({
      clientId: row.client_id,
      leadId: row.lead_id,
      customerNameKo: row.customer_name_ko,
      contactPhone: row.contact_phone,
      siteAddressKo: row.site_address_ko,
      consultationHistory: fromJson(row.consultation_history_json, []),
      estimateHistory: fromJson(row.estimate_history_json, []),
      contractHistory: fromJson(row.contract_history_json, []),
      claimHistory: fromJson(row.claim_history_json, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    const contracts = db.project.prepare('SELECT * FROM contracts ORDER BY updated_at DESC').all().map((row) => ({
      contractId: row.contract_id,
      clientId: row.client_id,
      projectId: row.project_id,
      leadId: row.lead_id,
      contractStatus: row.contract_status,
      contractAmount: row.contract_amount,
      depositRate: row.deposit_rate,
      interimRate: row.interim_rate,
      balanceRate: row.balance_rate,
      scopeSummaryKo: row.scope_summary_ko,
      exclusionsKo: row.exclusions_ko,
      changeOrderTermsKo: row.change_order_terms_ko,
      defectWarrantyTermsKo: row.defect_warranty_terms_ko,
      approvalRequired: Boolean(row.approval_required),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at
    }));
    const documents = db.project.prepare('SELECT * FROM contract_documents ORDER BY updated_at DESC').all().map((row) => ({
      documentId: row.document_id,
      contractId: row.contract_id,
      projectId: row.project_id,
      documentType: row.document_type,
      displayNameKo: row.display_name_ko,
      audience: row.audience,
      documentStatus: row.document_status,
      payload: fromJson(row.payload_json, {}),
      approvalRequired: Boolean(row.approval_required)
    }));
    const approvalLogs = db.project.prepare('SELECT * FROM contract_approval_logs ORDER BY created_at DESC').all().map((row) => ({
      contractApprovalLogId: row.contract_approval_log_id,
      contractId: row.contract_id,
      projectId: row.project_id,
      actionType: row.action_type,
      beforeStatus: row.before_status,
      afterStatus: row.after_status,
      actor: row.actor,
      reasonKo: row.reason_ko,
      createdAt: row.created_at
    }));
    return { snapshotDate: new Date().toISOString().slice(0, 10), clients, contracts, documents, approvalLogs };
  }

  function approveContract({ contractId, actor = 'CEO', reasonKo = '계약서 발행 승인' }) {
    const contract = db.project.prepare('SELECT * FROM contracts WHERE contract_id = ?').get(contractId);
    if (!contract) throw new Error(`Contract not found: ${contractId}`);
    const createdAt = nowIso();
    db.project.prepare(`
      UPDATE contracts
      SET contract_status = 'APPROVED', approval_required = 0, approved_by = ?, approved_at = ?, updated_at = ?
      WHERE contract_id = ?
    `).run(actor, createdAt, createdAt, contractId);
    db.project.prepare(`
      UPDATE contract_documents
      SET document_status = CASE WHEN document_type = 'CONTRACT' THEN 'APPROVED' ELSE document_status END,
          updated_at = ?
      WHERE contract_id = ?
    `).run(createdAt, contractId);
    db.project.prepare(`
      INSERT INTO contract_approval_logs (
        contract_approval_log_id, contract_id, project_id, action_type,
        before_status, after_status, actor, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `CONTRACT-APPROVAL-${Date.now()}`,
      contractId,
      contract.project_id,
      'APPROVE_CONTRACT',
      contract.contract_status,
      'APPROVED',
      actor,
      reasonKo,
      createdAt
    );
    db.approval.prepare(`
      UPDATE approvals
      SET status = 'APPROVED', updated_at = ?
      WHERE approval_id = ?
    `).run(createdAt, `APP-${contractId}-ISSUE`);
    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-${Date.now()}-CONTRACT`,
      new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      'INFO',
      `계약서 승인 완료: ${contractId}`,
      contract.project_id,
      '계약 승인',
      createdAt
    );
    return { clientContractData: getClientContractData(), dashboardData: getDashboardData() };
  }

  function seedProjectLearningData() {
    const createdAt = nowIso();
    db.project.prepare('INSERT INTO estimate_vs_actual (record_id, project_id, item_name_ko, variance_type, reason_ko, action_ko, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('EVA-001', 'PRJ-APT-2401', '타일공 최소 품수', 'laborCostVariance', '소량 시공에서 최소 품수 적용 누락 가능성', '승인', createdAt);
    db.project.prepare('INSERT INTO estimate_vs_actual (record_id, project_id, item_name_ko, variance_type, reason_ko, action_ko, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('EVA-002', 'PRJ-APT-2401', '방수 양생 대기시간', 'durationVariance', '후속 타일 공정 착수 지연 반복', '차단', createdAt);
    db.project.prepare('INSERT INTO repeated_defects (defect_id, project_id, defect_name_ko, reason_ko, action_ko, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('DEF-001', 'PRJ-APT-2401', '실리콘 곰팡이', '환기/자재/시공 후 관리 기준 재확인 필요', '승인', createdAt);
    db.project.prepare('INSERT INTO repeated_defects (defect_id, project_id, defect_name_ko, reason_ko, action_ko, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('DEF-002', 'PRJ-APT-2401', '줄눈 오염', '줄눈재 선택과 고객 사용 조건 연결 필요', '승인', createdAt);
    db.project.prepare('INSERT INTO repeated_loss_processes (loss_id, project_id, process_name_ko, reason_ko, action_ko, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('LOSS-001', 'PRJ-APT-2401', '졸리컷', '난이도 할증과 소모품 반영 부족', '승인', createdAt);
    db.project.prepare('INSERT INTO repeated_loss_processes (loss_id, project_id, process_name_ko, reason_ko, action_ko, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('LOSS-002', 'PRJ-APT-2401', '폐기물 반출', '양중/운반 통합비 누락', '발주', createdAt);
  }

  function seedApprovals() {
    const createdAt = nowIso();
    const insert = db.approval.prepare(`
      INSERT INTO approvals (
        approval_id, project_id, approval_type, title_ko, reason_ko,
        status, rollback_required, rollback_status, blocking_impact_ko,
        requested_by, requested_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['APP-001', 'PRJ-APT-2401', 'MasterDbUpdateRequest', '타일공 최소 품수 기준 보정', '소량 타일 공정에서 실제 노무비가 반복 초과되었습니다.', 'PENDING_CEO_APPROVAL', 1, 'READY', '내부 원가 확정 보류'],
      ['APP-002', 'PRJ-BATH-0501', 'BrandChange', '타일 대체 브랜드 발주', '기존 브랜드 납기 지연으로 대체 브랜드 발주가 필요합니다.', 'PENDING_CEO_APPROVAL', 0, 'NOT_REQUIRED', '발주 보류'],
      ['APP-003', 'PRJ-APT-2401', 'DefectRework', '방수 재검수 및 재시공', '방수 검수 실패로 후속 타일 공정이 차단되었습니다.', 'PENDING_CEO_APPROVAL', 0, 'NOT_REQUIRED', '타일 후속 공정 차단']
    ].forEach((row) => insert.run(...row, 'CEO', createdAt, createdAt));
  }

  function seedMasterRequests() {
    const createdAt = nowIso();
    db.master.prepare(`
      INSERT INTO master_db_update_requests (
        request_id, source_project_id, target_db, target_item_id,
        current_value_json, proposed_value_json, change_reason_ko,
        evidence_json, impact_analysis_json, risk_level, approval_status,
        rollback_data_json, requested_by, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'MDB-REQ-001',
      'PRJ-APT-2401',
      'process-db',
      'tile_minimum_labor_charge',
      toJson({ minimumLaborCharge: 'NEEDS_RESEARCH' }),
      toJson({ minimumLaborChargePolicy: '소량 타일 공정 최소 품수 재검토' }),
      '소량 타일 공정에서 실제 노무비가 반복 초과되었습니다.',
      toJson(['EVA-001', 'LOSS-001']),
      toJson({ affectedOutputs: ['internalCost', 'marginTable'], requiresApproval: true }),
      'HIGH',
      'PENDING_CEO_APPROVAL',
      toJson({ beforeValue: { minimumLaborCharge: 'NEEDS_RESEARCH' }, rollbackAvailable: true }),
      'BOC',
      createdAt
    );
  }

  function seedBathroomPricingStandardV2() {
    const createdAt = nowIso();
    const evidence = {
      sourceProjectId: 'PRJ-PROD-BATH-0001',
      revenue: 5490000,
      recoveredActualCost: 5070000,
      actualMargin: 420000,
      actualMarginRate: 0.0765,
      pricingReverseEngineering: 'customer-price-first model produced insufficient margin'
    };

    const insertStandard = db.master.prepare(`
      INSERT OR REPLACE INTO bathroom_pricing_standards (
        standard_id, version, package_code, package_name_ko, installation_method,
        cost_floor, minimum_margin_rate, minimum_allowed_price, recommended_price,
        target_margin_rate, included_items_json, excluded_upsells_json,
        rule_status, source_project_id, source_evidence_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      {
        id: 'BATH-PRICE-V2-BASIC-BOND',
        code: 'BASIC',
        nameKo: 'Basic / 기본형',
        method: 'BOND',
        costFloor: 4420000,
        minMargin: 0.2,
        minPrice: 5530000,
        recommended: 5900000,
        target: 0.25,
        included: ['본드시공', '기본 타일 시공', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소'],
        excluded: ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']
      },
      {
        id: 'BATH-PRICE-V2-STANDARD-BOND',
        code: 'STANDARD',
        nameKo: 'Standard / 표준형',
        method: 'BOND',
        costFloor: 5070000,
        minMargin: 0.25,
        minPrice: 6760000,
        recommended: 6800000,
        target: 0.25,
        included: ['본드시공', '기본 타일 시공', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소', '현장관리 버퍼'],
        excluded: ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']
      },
      {
        id: 'BATH-PRICE-V2-PREMIUM-BOND',
        code: 'PREMIUM',
        nameKo: 'Premium / 프리미엄형',
        method: 'BOND',
        costFloor: 5070000,
        minMargin: 0.3,
        minPrice: 7250000,
        recommended: 7300000,
        target: 0.3,
        included: ['본드시공', '기본 타일 시공', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소', '프리미엄 현장관리 버퍼'],
        excluded: ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']
      }
    ].forEach((item) => {
      insertStandard.run(
        item.id,
        'BATHROOM_PRICING_STANDARD_V2',
        item.code,
        item.nameKo,
        item.method,
        item.costFloor,
        item.minMargin,
        item.minPrice,
        item.recommended,
        item.target,
        toJson(item.included),
        toJson(item.excluded),
        'ACTIVE',
        'PRJ-PROD-BATH-0001',
        toJson(evidence),
        createdAt,
        createdAt
      );
    });

    const insertOption = db.master.prepare(`
      INSERT OR REPLACE INTO bathroom_pricing_options (
        option_id, version, display_name_ko, option_type, default_included,
        cost_basis, minimum_sale_price, approval_required, customer_visible,
        pricing_status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['BATH-OPT-V2-SHOWER-BOOTH', '샤워부스 / 파티션', 'UPSELL', 0, 300000, 400000, 0, 1, 'ACTIVE', '기본 포함 금지. 선택 시 업셀.'],
      ['BATH-OPT-V2-ZENDAI', '젠다이 + 대리석 마감', 'UPSELL', 0, 350000, 470000, 0, 1, 'ACTIVE', '기본 포함 금지. 선택 시 업셀.'],
      ['BATH-OPT-V2-600-POLISHING', '600각 폴리싱 타일', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '기본 포함 금지. 실제 공급가 입력 전 견적 확정 차단.'],
      ['BATH-OPT-V2-IMPORT-FIXTURE', '수입 도기 / 고급 도기', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '아메리칸스탠다드/TOTO/Grohe 등 모델별 공급가 필요.'],
      ['BATH-OPT-V2-EPOXY-GROUT', '에폭시 줄눈', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '기본 포함 금지. 실제 자재/시공 단가 필요.'],
      ['BATH-OPT-V2-JOLLY-CUT', '졸리컷', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '시공 난이도와 파손 리스크 때문에 대표 승인 필요.'],
      ['BATH-OPT-V2-FLOATING-MORTAR', '떠붙임 시공 전환', 'INSTALL_METHOD', 0, 500000, 670000, 0, 1, 'ACTIVE', '본드시공과 완전 분리. 기존 타일 철거 + 떠붙임.']
    ].forEach((row) => insertOption.run(row[0], 'BATHROOM_PRICING_STANDARD_V2', ...row.slice(1), createdAt, createdAt));

    const insertRule = db.master.prepare(`
      INSERT OR REPLACE INTO margin_safety_rules (
        rule_id, version, rule_name, display_name_ko, minimum_margin_rate,
        warning_margin_rate, target_margin_rate, block_below_price,
        approval_required, blocking_message_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['BATH-MARGIN-V2-BLOCK-BELOW-20', 'blockBelowMinimumMargin', '20% 미만 수주 자동 차단', 0.2, 0.25, 0.3, 5530000, 1, '최소 마진율 20% 미만 또는 Basic 최저가 이하 견적은 대표 승인 없이 수주할 수 없습니다.'],
      ['BATH-MARGIN-V2-CEO-APPROVAL-20-25', 'ceoApprovalBetween20And25', '20~25% 구간 대표 승인', 0.2, 0.25, 0.3, 5530000, 1, '20~25% 구간은 계약 가능성이 아니라 사업성 기준으로 대표 승인이 필요합니다.'],
      ['BATH-MARGIN-V2-TARGET-25PLUS', 'targetMargin25Plus', '권장 마진 25% 이상', 0.25, 0.25, 0.3, 5900000, 0, '욕실 단독 리모델링은 25% 이상을 기본 목표로 합니다.']
    ].forEach((row) => insertRule.run(row[0], 'BATHROOM_PRICING_STANDARD_V2', ...row.slice(1), createdAt, createdAt));
  }

  function seedKitchenPricingStandardV1() {
    const createdAt = nowIso();
    const evidence = {
      source: 'Kitchen Remodeling Standard V1',
      principle: 'minimum 25 percent margin target, block below 20 percent',
      pricingNote: 'actual supplier prices remain UNKNOWN / NEEDS_RESEARCH until verified'
    };

    const insertStandard = db.master.prepare(`
      INSERT OR REPLACE INTO kitchen_pricing_standards (
        standard_id, version, package_code, package_name_ko,
        cost_floor, minimum_margin_rate, minimum_allowed_price, recommended_price,
        target_margin_rate, included_items_json, excluded_upsells_json,
        rule_status, source_evidence_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      {
        id: 'KITCHEN-PRICE-V1-BASIC',
        code: 'BASIC',
        nameKo: 'Basic / 기본형',
        costFloor: 5200000,
        minPrice: 6934000,
        recommended: 7200000,
        target: 0.25,
        included: ['기본 싱크대', '기본 상판', '기본 후드', '기본 수전', '싱크볼', '철거', '폐기물', '운반비', '기본 조명'],
        excluded: ['상판 업그레이드', '도어 마감 업그레이드', '고급 하드웨어', '고급 후드', '고급 수전', '주방 벽타일 확장', '빌트인 가전']
      },
      {
        id: 'KITCHEN-PRICE-V1-STANDARD',
        code: 'STANDARD',
        nameKo: 'Standard / 표준형',
        costFloor: 7200000,
        minPrice: 9600000,
        recommended: 9900000,
        target: 0.25,
        included: ['표준 싱크대', '표준 상판', '표준 후드', '표준 수전', '싱크볼', '주방 벽타일 기본 범위', '철거', '폐기물', '운반비', '조명'],
        excluded: ['엔지니어드스톤/세라믹 상판', '수입 하드웨어', '빌트인 가전', '고급 후드', '도장/무늬목 도어']
      },
      {
        id: 'KITCHEN-PRICE-V1-PREMIUM',
        code: 'PREMIUM',
        nameKo: 'Premium / 프리미엄형',
        costFloor: 9800000,
        minPrice: 13067000,
        recommended: 13500000,
        target: 0.3,
        included: ['프리미엄 싱크대', '상판 업그레이드 예산', '고급 후드 예산', '고급 수전 예산', '싱크볼', '주방 벽타일', '철거', '폐기물', '운반비', '조명'],
        excluded: ['빌트인 가전 본품', '수입 특수 하드웨어', '구조 변경', '급배수 대규모 이동']
      }
    ].forEach((item) => {
      insertStandard.run(
        item.id,
        'KITCHEN_REMODELING_STANDARD_V1',
        item.code,
        item.nameKo,
        item.costFloor,
        0.25,
        item.minPrice,
        item.recommended,
        item.target,
        toJson(item.included),
        toJson(item.excluded),
        'ACTIVE',
        toJson(evidence),
        createdAt,
        createdAt
      );
    });

    const insertOption = db.master.prepare(`
      INSERT OR REPLACE INTO kitchen_pricing_options (
        option_id, version, display_name_ko, option_type, default_included,
        cost_basis, minimum_sale_price, approval_required, customer_visible,
        pricing_status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['KITCHEN-OPT-V1-COUNTERTOP', '상판 종류', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '인조대리석, 엔지니어드스톤, 세라믹 등급별 공급가 확인 필요'],
      ['KITCHEN-OPT-V1-DOOR-FINISH', '도어 마감', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', 'PET, 도장, 무늬목, 우레탄 마감 분리'],
      ['KITCHEN-OPT-V1-HARDWARE', '하드웨어', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '경첩, 레일, 댐퍼, 손잡이 등급 분리'],
      ['KITCHEN-OPT-V1-HOOD', '후드', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '기본형/슬림/침니/빌트인 후드 분리'],
      ['KITCHEN-OPT-V1-FAUCET', '수전', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '기본 수전과 고급 수전 분리'],
      ['KITCHEN-OPT-V1-SINK-BOWL', '싱크볼', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '사각볼, 언더볼, 대형볼 등급 분리'],
      ['KITCHEN-OPT-V1-WALL-TILE', '주방 벽타일', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '기본 범위 초과 시 면적별 산출'],
      ['KITCHEN-OPT-V1-BUILT-IN', '빌트인 가전', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '가전 본품, 전기 증설, 제작 치수 별도 승인 필요']
    ].forEach((row) => insertOption.run(row[0], 'KITCHEN_REMODELING_STANDARD_V1', ...row.slice(1), createdAt, createdAt));

    const insertRule = db.master.prepare(`
      INSERT OR REPLACE INTO margin_safety_rules (
        rule_id, version, rule_name, display_name_ko, minimum_margin_rate,
        warning_margin_rate, target_margin_rate, block_below_price,
        approval_required, blocking_message_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['KITCHEN-MARGIN-V1-BLOCK-BELOW-20', 'blockBelow20', '20% 미만 자동 차단', 0.2, 0.25, 0.3, 6934000, 1, '주방 견적은 20% 미만 마진율에서 FINAL_ESTIMATE로 전환할 수 없습니다.'],
      ['KITCHEN-MARGIN-V1-CEO-APPROVAL-20-25', 'ceoApprovalBetween20And25', '20~25% 대표 승인', 0.2, 0.25, 0.3, 6934000, 1, '20~25% 구간은 대표 승인 후에만 진행 가능합니다.'],
      ['KITCHEN-MARGIN-V1-TARGET-25PLUS', 'targetMargin25Plus', '최소 목표 25% 이상', 0.25, 0.25, 0.3, 7200000, 0, '주방 리모델링은 최소 25% 이상 마진율을 기본 기준으로 봅니다.']
    ].forEach((row) => insertRule.run(row[0], 'KITCHEN_REMODELING_STANDARD_V1', ...row.slice(1), createdAt, createdAt));
  }

  function seedUniversalProjectTypeConfigs() {
    const createdAt = nowIso();
    const insertConfig = db.master.prepare(`
      INSERT OR REPLACE INTO project_type_configs (
        project_type, display_name_ko, package_field, config_status,
        margin_rules_json, cost_capture_rules_json, source_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPackage = db.master.prepare(`
      INSERT OR REPLACE INTO project_type_packages (
        package_id, project_type, package_code, package_name_ko,
        cost_floor, minimum_margin_rate, minimum_allowed_price,
        recommended_price, target_margin_rate, included_items_json,
        excluded_options_json, package_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMandatory = db.master.prepare(`
      INSERT OR REPLACE INTO project_type_mandatory_items (
        mandatory_item_id, project_type, item_id, item_name_ko,
        enforcement_level, cost_category, required_stage, reason_ko,
        approval_required_on_remove, item_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOption = db.master.prepare(`
      INSERT OR REPLACE INTO project_type_options (
        option_id, project_type, display_name_ko, option_type,
        default_included, pricing_status, customer_visible,
        approval_required, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const configs = [
      {
        projectType: 'bathroom_remodeling',
        displayNameKo: '욕실 리모델링',
        packageField: 'bathroomPackage',
        sourceVersion: 'BATHROOM_PRICING_STANDARD_V2',
        packages: [
          ['BASIC', 'Basic / 기본형', 4420000, 0.2, 5530000, 5900000, 0.25, ['본드시공', '기본 타일', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소'], ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']],
          ['STANDARD', 'Standard / 표준형', 5070000, 0.25, 6760000, 6800000, 0.25, ['본드시공', '기본 타일', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소', '현장관리 버퍼'], ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']],
          ['PREMIUM', 'Premium / 프리미엄형', 5070000, 0.3, 7250000, 7300000, 0.3, ['본드시공', '기본 타일', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소', '프리미엄 현장관리 버퍼'], ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']]
        ],
        mandatoryItems: [
          ['demolition_cost', '철거비', 'AUTO_LOCKED', 'demolition', 'DEMOLITION_COMPLETE', '욕실 견적 누락 방지 필수 항목'],
          ['waste_disposal_cost', '폐기물 반출비', 'AUTO_LOCKED', 'waste', 'WASTE_REMOVED', '폐기물 비용 누락 방지 필수 항목'],
          ['transport_cost', '운반비', 'AUTO_LOCKED', 'transport', 'MATERIAL_DELIVERY', '운반비 누락 방지 필수 항목'],
          ['misc_contingency_cost', '기타 잡비 / contingency', 'AUTO_LOCKED', 'miscellaneous', 'SITE_OPERATION', '기타 잡비 누락 방지 필수 항목'],
          ['tile_accessory_package', '타일 부자재 패키지', 'MANDATORY', 'tileAccessory', 'PURCHASE_ORDER_READY', '타일 부자재 과소 산정 방지 필수 항목']
        ],
        options: [
          ['shower_booth', '샤워부스 / 파티션', 'UPSELL', 0, 'ACTIVE', 1, 0, '기본 포함 금지, 선택 시 업셀'],
          ['jendai', '젠다이 + 대리석 마감', 'UPSELL', 0, 'ACTIVE', 1, 0, '기본 포함 금지, 선택 시 업셀'],
          ['large_tile', '600각 폴리싱 타일', 'UPSELL', 0, 'NEEDS_SUPPLIER_PRICE', 1, 1, '실제 공급가 확인 필요']
        ]
      },
      {
        projectType: 'kitchen_remodeling',
        displayNameKo: '주방 리모델링',
        packageField: 'kitchenPackage',
        sourceVersion: 'KITCHEN_REMODELING_STANDARD_V1',
        packages: [
          ['BASIC', 'Basic / 기본형', 5200000, 0.25, 6934000, 7200000, 0.25, ['기본 싱크대', '기본 상판', '기본 후드', '기본 수전', '싱크볼', '철거', '폐기물', '운반비', '기본 조명'], ['상판 업그레이드', '도어 마감 업그레이드', '고급 하드웨어', '고급 후드', '고급 수전', '주방 벽타일 확장', '빌트인 가전']],
          ['STANDARD', 'Standard / 표준형', 7200000, 0.25, 9600000, 9900000, 0.25, ['표준 싱크대', '표준 상판', '표준 후드', '표준 수전', '주방 벽타일 기본 범위', '철거', '폐기물', '운반비', '조명'], ['엔지니어드스톤/세라믹 상판', '수입 하드웨어', '빌트인 가전', '고급 후드', '도장/무늬목 도어']],
          ['PREMIUM', 'Premium / 프리미엄형', 9800000, 0.25, 13067000, 13500000, 0.3, ['프리미엄 싱크대', '상판 업그레이드 예산', '고급 후드 예산', '고급 수전 예산', '주방 벽타일', '철거', '폐기물', '운반비', '조명'], ['빌트인 가전 본품', '수입 특수 하드웨어', '구조 변경', '급배수 대규모 이동']]
        ],
        mandatoryItems: [
          ['kitchen_demolition_cost', '주방 철거비', 'MANDATORY', 'demolition', 'DEMOLITION_COMPLETE', '주방 철거 누락 방지 필수 항목'],
          ['kitchen_waste_disposal_cost', '주방 폐기물 반출비', 'MANDATORY', 'waste', 'WASTE_REMOVED', '주방 폐기물 누락 방지 필수 항목'],
          ['kitchen_transport_cost', '주방 운반비', 'MANDATORY', 'transport', 'MATERIAL_DELIVERY', '주방 운반비 누락 방지 필수 항목'],
          ['kitchen_sink_cabinet_package', '싱크대 본체 패키지', 'MANDATORY', 'material', 'PURCHASE_ORDER_READY', '싱크대 본체 누락 방지 필수 항목'],
          ['kitchen_countertop_package', '상판 패키지', 'MANDATORY', 'material', 'PURCHASE_ORDER_READY', '상판 원가 누락 방지 필수 항목'],
          ['kitchen_tile_accessory_package', '주방 벽타일 및 부자재', 'MANDATORY', 'tileAccessory', 'PURCHASE_ORDER_READY', '주방 벽타일/부자재 누락 방지 필수 항목'],
          ['kitchen_misc_contingency_cost', '주방 기타 잡비 / contingency', 'MANDATORY', 'miscellaneous', 'SITE_OPERATION', '주방 기타 잡비 누락 방지 필수 항목']
        ],
        options: [
          ['countertop_type', '상판 종류', 'UPSELL', 0, 'NEEDS_SUPPLIER_PRICE', 1, 1, '인조대리석, 엔지니어드스톤, 세라믹 분리'],
          ['door_finish', '도어 마감', 'UPSELL', 0, 'NEEDS_SUPPLIER_PRICE', 1, 1, 'PET, 도장, 무늬목, 우레탄 분리'],
          ['hardware', '하드웨어', 'UPSELL', 0, 'NEEDS_SUPPLIER_PRICE', 1, 1, '경첩, 레일, 댐퍼, 손잡이 등급 분리'],
          ['hood', '후드', 'UPSELL', 0, 'NEEDS_SUPPLIER_PRICE', 1, 1, '기본/슬림/침니/빌트인 후드 분리'],
          ['built_in_appliances', '빌트인 가전', 'UPSELL', 0, 'NEEDS_SUPPLIER_PRICE', 1, 1, '가전 본품 및 전기 증설 별도']
        ]
      },
      {
        projectType: 'full_remodel',
        displayNameKo: '전체 리모델링',
        packageField: 'bathroomPackage',
        sourceVersion: 'FULL_REMODEL_PLACEHOLDER_V1',
        packages: [],
        mandatoryItems: [],
        options: []
      },
      {
        projectType: 'restoration',
        displayNameKo: '원상복구 공사',
        packageField: 'bathroomPackage',
        sourceVersion: 'RESTORATION_PLACEHOLDER_V1',
        packages: [],
        mandatoryItems: [],
        options: []
      }
    ];

    configs.forEach((config) => {
      insertConfig.run(
        config.projectType,
        config.displayNameKo,
        config.packageField,
        config.packages.length ? 'ACTIVE' : 'STRUCTURE_READY',
        toJson({ blockBelowMarginRate: 0.2, ceoApprovalBelowMarginRate: 0.25, priorityAtMarginRate: 0.3 }),
        toJson({ universalCaptureRequired: true, completionBlockedWhenMissing: true }),
        config.sourceVersion,
        createdAt,
        createdAt
      );

      config.packages.forEach((pkg) => insertPackage.run(
        `${config.projectType}-${pkg[0]}`,
        config.projectType,
        pkg[0],
        pkg[1],
        pkg[2],
        pkg[3],
        pkg[4],
        pkg[5],
        pkg[6],
        toJson(pkg[7]),
        toJson(pkg[8]),
        'ACTIVE',
        createdAt,
        createdAt
      ));

      config.mandatoryItems.forEach((item) => insertMandatory.run(
        `${config.projectType}-${item[0]}`,
        config.projectType,
        item[0],
        item[1],
        item[2],
        item[3],
        item[4],
        item[5],
        1,
        'ACTIVE',
        createdAt,
        createdAt
      ));

      config.options.forEach((option) => insertOption.run(
        `${config.projectType}-${option[0]}`,
        config.projectType,
        option[1],
        option[2],
        option[3],
        option[4],
        option[5],
        option[6],
        option[7],
        createdAt,
        createdAt
      ));
    });
  }

  function seedVendorRealPriceIntegrationLayer() {
    const createdAt = nowIso();
    const insertMapping = db.master.prepare(`
      INSERT OR REPLACE INTO material_price_mapping (
        mapping_id, project_type, item_id, material_id, material_name_ko,
        category, price_priority_json, fallback_basis, mapping_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['bathroom_remodeling', 'tile_accessory_package', 'tile_accessory_package', '타일 부자재 패키지', 'tileAccessory', 'project_type_cost_floor'],
      ['bathroom_remodeling', 'waste_disposal_cost', 'waste_disposal', '폐기물 반출', 'waste', 'project_type_cost_floor'],
      ['bathroom_remodeling', 'transport_cost', 'transport', '운반비', 'transport', 'project_type_cost_floor'],
      ['kitchen_remodeling', 'kitchen_sink_cabinet_package', 'kitchen_sink_cabinet', '싱크대 본체 패키지', 'material', 'project_type_cost_floor'],
      ['kitchen_remodeling', 'kitchen_countertop_package', 'kitchen_countertop', '상판 패키지', 'material', 'project_type_cost_floor'],
      ['kitchen_remodeling', 'kitchen_tile_accessory_package', 'kitchen_tile_accessory', '주방 벽타일 및 부자재', 'tileAccessory', 'project_type_cost_floor'],
      ['kitchen_remodeling', 'kitchen_transport_cost', 'kitchen_transport', '주방 운반비', 'transport', 'project_type_cost_floor'],
      ['kitchen_remodeling', 'kitchen_waste_disposal_cost', 'kitchen_waste_disposal', '주방 폐기물 반출비', 'waste', 'project_type_cost_floor']
    ].forEach((row) => insertMapping.run(
      `MAP-${row[0]}-${row[1]}`,
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      toJson(['vendor_price_catalog.VERIFIED', 'internal_standard', 'fallback_estimate']),
      row[5],
      'ACTIVE',
      createdAt,
      createdAt
    ));

    const insertCatalog = db.master.prepare(`
      INSERT OR IGNORE INTO vendor_price_catalog (
        price_id, vendor_id, vendor_name_ko, material_id, material_name_ko,
        category, brand_name, model_name, standard_spec, unit,
        supplier_price, internal_price, price_status, source_type,
        source_name, source_date, confidence_level, approval_status,
        notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['VPC-TILE-ACCESSORY-NEEDS-RESEARCH', 'UNKNOWN', 'UNKNOWN', 'tile_accessory_package', '타일 부자재 패키지', 'tileAccessory', 'UNKNOWN', 'UNKNOWN', '욕실/주방 타일 부자재 통합', 'PACKAGE'],
      ['VPC-KITCHEN-SINK-NEEDS-RESEARCH', 'UNKNOWN', 'UNKNOWN', 'kitchen_sink_cabinet', '싱크대 본체 패키지', 'material', 'UNKNOWN', 'UNKNOWN', '주방 싱크대 패키지', 'PACKAGE'],
      ['VPC-KITCHEN-COUNTERTOP-NEEDS-RESEARCH', 'UNKNOWN', 'UNKNOWN', 'kitchen_countertop', '상판 패키지', 'material', 'UNKNOWN', 'UNKNOWN', '주방 상판 패키지', 'M'],
      ['VPC-TRANSPORT-NEEDS-RESEARCH', 'UNKNOWN', 'UNKNOWN', 'transport', '운반비', 'transport', 'UNKNOWN', 'UNKNOWN', '현장 운반비', 'EA'],
      ['VPC-WASTE-NEEDS-RESEARCH', 'UNKNOWN', 'UNKNOWN', 'waste_disposal', '폐기물 반출', 'waste', 'UNKNOWN', 'UNKNOWN', '현장 폐기물 반출', 'EA']
    ].forEach((row) => insertCatalog.run(
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      null,
      null,
      'NEEDS_RESEARCH',
      'vendor_crm',
      'Vendor CRM 입력 대기',
      createdAt.slice(0, 10),
      'LOW',
      'PENDING_RESEARCH',
      '실제 공급가 입력 전까지 견적에는 fallback 기준값을 사용합니다.',
      createdAt,
      createdAt
    ));
  }

  function seedNotificationLogs() {
    const insert = db.logs.prepare('INSERT INTO notification_logs (log_id, time_label, level, message_ko, related_project_id, action_ko, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const createdAt = nowIso();
    [
      ['LOG-001', '09:12', 'RED', '방수 검수 실패', 'PRJ-APT-2401', '차단'],
      ['LOG-002', '09:43', 'WARNING', '타일 발주 지연 경고', 'PRJ-BATH-0501', '발주'],
      ['LOG-003', '10:21', 'INFO', 'Master DB 업데이트 승인 요청 생성', 'GLOBAL', '승인'],
      ['LOG-004', '10:47', 'WARNING', '잔금 청구 조건 미충족', 'PRJ-APT-2401', '청구']
    ].forEach((row) => insert.run(...row, createdAt));
  }

  function seedScheduledJobs() {
    const createdAt = nowIso();
    const jobs = [
      ['JOB-AUTOMATION-5M', 'Critical event sweep', 'EVENT_SWEEP_5M', 5],
      ['JOB-AUTOMATION-1H', 'Operations event sweep', 'EVENT_SWEEP_1H', 60],
      ['JOB-AUTOMATION-1D', 'Daily action planner', 'EVENT_SWEEP_1D', 1440]
    ];

    const insert = db.logs.prepare(`
      INSERT OR IGNORE INTO scheduled_jobs (
        job_id, job_name, job_type, interval_minutes, enabled,
        last_run_at, next_run_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    jobs.forEach(([jobId, jobName, jobType, intervalMinutes]) => {
      insert.run(jobId, jobName, jobType, intervalMinutes, 1, null, createdAt, createdAt, createdAt);
    });
  }

  function seedUserRolePermissions() {
    const createdAt = nowIso();
    const roles = [
      ['CEO', 'CEO', '대표', '최종 승인, 복구, Master DB 반영을 포함한 전체 통제 권한'],
      ['SiteManager', 'SiteManager', '현장관리자', '공사일보, 검수, 현장 이슈, 추가공사 요청 입력 권한'],
      ['Estimator', 'Estimator', '견적담당', '예비 견적 생성과 견적 초안 수정 권한'],
      ['FinanceManager', 'FinanceManager', '재무담당', '수금, 지급, 현금흐름, Export 권한'],
      ['Vendor', 'Vendor', '외부협력사', '자기 공급가와 납기 정보 제출 권한'],
      ['ReadOnly', 'ReadOnly', '읽기전용', '조회만 가능한 권한']
    ];
    const permissionKeys = [
      'MASTER_DB_UPDATE_REQUEST',
      'MASTER_DB_APPROVE',
      'FINAL_ESTIMATE_APPROVE',
      'EXECUTION_TRANSITION',
      'COMPLETION_APPROVE',
      'COST_CAPTURE_INPUT',
      'VENDOR_PRICE_INPUT',
      'VENDOR_PRICE_APPROVE',
      'BACKUP_CREATE',
      'RESTORE_EXECUTE',
      'EXPORT_DATA',
      'SITE_OPERATION_INPUT',
      'FINANCE_INPUT',
      'ESTIMATE_DRAFT_CREATE'
    ];
    const allowedByRole = {
      CEO: permissionKeys,
      SiteManager: ['SITE_OPERATION_INPUT', 'COST_CAPTURE_INPUT'],
      Estimator: ['ESTIMATE_DRAFT_CREATE', 'MASTER_DB_UPDATE_REQUEST'],
      FinanceManager: ['FINANCE_INPUT', 'COST_CAPTURE_INPUT', 'EXPORT_DATA', 'BACKUP_CREATE'],
      Vendor: ['VENDOR_PRICE_INPUT'],
      ReadOnly: []
    };

    const insertRole = db.logs.prepare(`
      INSERT OR IGNORE INTO roles (
        role_id, role_name, display_name_ko, description_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    roles.forEach((role) => insertRole.run(...role, createdAt, createdAt));

    db.logs.prepare(`
      INSERT OR IGNORE INTO users (
        user_id, user_name_ko, role_id, user_status, is_local_mock, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('USER-LOCAL-CEO', '대표', 'CEO', 'ACTIVE', 1, createdAt, createdAt);

    const insertPermission = db.logs.prepare(`
      INSERT OR IGNORE INTO permissions (
        permission_id, permission_key, role_id, allowed, scope_json,
        description_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    roles.forEach(([roleId]) => {
      permissionKeys.forEach((permissionKey) => {
        const allowed = allowedByRole[roleId].includes(permissionKey) ? 1 : 0;
        insertPermission.run(
          `PERM-${roleId}-${permissionKey}`,
          permissionKey,
          roleId,
          allowed,
          toJson({ scope: roleId === 'Vendor' ? 'OWN_VENDOR_DATA_ONLY' : 'SYSTEM' }),
          permissionDescriptionKo(permissionKey),
          createdAt,
          createdAt
        );
      });
    });
  }

  function permissionDescriptionKo(permissionKey) {
    const map = {
      MASTER_DB_UPDATE_REQUEST: 'Master DB 수정 요청',
      MASTER_DB_APPROVE: 'Master DB 승인',
      FINAL_ESTIMATE_APPROVE: 'FINAL_ESTIMATE 승인',
      EXECUTION_TRANSITION: 'Execution 전환',
      COMPLETION_APPROVE: 'Completion 승인',
      COST_CAPTURE_INPUT: 'Cost Capture 입력',
      VENDOR_PRICE_INPUT: 'Vendor Price 입력',
      VENDOR_PRICE_APPROVE: 'Vendor Price 승인',
      BACKUP_CREATE: 'Backup 생성',
      RESTORE_EXECUTE: 'Restore 실행',
      EXPORT_DATA: 'Export 실행',
      SITE_OPERATION_INPUT: '현장 운영 입력',
      FINANCE_INPUT: '수금/지급/현금흐름 입력',
      ESTIMATE_DRAFT_CREATE: '견적 초안 생성'
    };
    return map[permissionKey] || permissionKey;
  }

  function resolveActorUser(actor = 'CEO') {
    const normalized = actor || 'CEO';
    const user = db.logs.prepare('SELECT * FROM users WHERE user_id = ? OR role_id = ? OR user_name_ko = ? ORDER BY is_local_mock DESC LIMIT 1').get(normalized, normalized, normalized);
    if (user) return user;
    const fallbackRole = ['CEO', 'SiteManager', 'Estimator', 'FinanceManager', 'Vendor', 'ReadOnly'].includes(normalized) ? normalized : 'ReadOnly';
    return {
      user_id: `ACTOR-${normalized}`,
      user_name_ko: normalized,
      role_id: fallbackRole,
      user_status: 'ACTIVE',
      is_local_mock: 1
    };
  }

  function logPermissionDecision({ actor, permissionKey, actionType, allowed, reasonKo, payload = {} }) {
    const createdAt = nowIso();
    const user = resolveActorUser(actor);
    db.logs.prepare(`
      INSERT INTO user_permission_logs (
        permission_log_id, user_id, role_id, permission_key, action_type,
        allowed, reason_ko, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `UPLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      user.user_id,
      user.role_id,
      permissionKey,
      actionType,
      allowed ? 1 : 0,
      reasonKo,
      toJson(payload),
      createdAt
    );

    if (!allowed) {
      db.logs.prepare(`
        INSERT INTO action_logs (
          action_log_id, action_type, actor, project_id, approval_id,
          payload_json, reason_ko, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `ACTLOG-PERM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        'PERMISSION_DENIED',
        actor,
        payload.projectId || 'GLOBAL',
        payload.approvalId || null,
        toJson({ permissionKey, actionType, roleId: user.role_id }),
        reasonKo,
        createdAt
      );
    }
  }

  function requirePermission({ actor = 'CEO', permissionKey, actionType, payload = {} }) {
    const user = resolveActorUser(actor);
    const permission = db.logs.prepare(`
      SELECT *
      FROM permissions
      WHERE role_id = ? AND permission_key = ?
    `).get(user.role_id, permissionKey);
    const allowed = user.user_status === 'ACTIVE' && Boolean(permission?.allowed);
    const reasonKo = allowed
      ? `${user.role_id} 권한 확인: ${permissionDescriptionKo(permissionKey)}`
      : `권한 없음: ${user.role_id} 역할은 ${permissionDescriptionKo(permissionKey)} 실행 불가`;
    logPermissionDecision({ actor, permissionKey, actionType, allowed, reasonKo, payload });
    if (!allowed) {
      throw new Error(`Permission denied: ${user.role_id} cannot ${permissionKey}.`);
    }
    return { user, permission };
  }

  function getPermissionAdminData() {
    seedUserRolePermissions();
    const currentUser = resolveActorUser('CEO');
    return {
      currentUser: {
        userId: currentUser.user_id,
        userNameKo: currentUser.user_name_ko,
        roleId: currentUser.role_id,
        userStatus: currentUser.user_status,
        isLocalMock: Boolean(currentUser.is_local_mock)
      },
      roles: db.logs.prepare('SELECT * FROM roles ORDER BY role_id').all().map((row) => ({
        roleId: row.role_id,
        roleName: row.role_name,
        displayNameKo: row.display_name_ko,
        descriptionKo: row.description_ko
      })),
      permissions: db.logs.prepare('SELECT * FROM permissions ORDER BY role_id, permission_key').all().map((row) => ({
        permissionId: row.permission_id,
        permissionKey: row.permission_key,
        roleId: row.role_id,
        allowed: Boolean(row.allowed),
        scope: fromJson(row.scope_json, {}),
        descriptionKo: row.description_ko
      })),
      recentLogs: db.logs.prepare('SELECT * FROM user_permission_logs ORDER BY created_at DESC LIMIT 50').all().map((row) => ({
        permissionLogId: row.permission_log_id,
        userId: row.user_id,
        roleId: row.role_id,
        permissionKey: row.permission_key,
        actionType: row.action_type,
        allowed: Boolean(row.allowed),
        reasonKo: row.reason_ko,
        createdAt: row.created_at
      }))
    };
  }

  function assertUserPermission(payload) {
    return requirePermission(payload);
  }

  function seedCostCaptureV2() {
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO cost_capture_requirements (
        requirement_id, project_id, process_id, cost_category, item_name_ko,
        required_stage, blocking_level, source_type, vendor_required,
        amount_required, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['CCR-PRJ-PROD-BATH-0001-DEMOLITION', 'PRJ-PROD-BATH-0001', 'bathroom_demolition', 'demolition', '철거 실제 원가', 'DEMOLITION_COMPLETE', 'RED', 'siteInput', 0, 1, 'MISSING_CRITICAL'],
      ['CCR-PRJ-PROD-BATH-0001-WASTE', 'PRJ-PROD-BATH-0001', 'waste_disposal', 'waste', '폐기물 반출 실제 원가', 'WASTE_REMOVED', 'RED', 'siteInput', 1, 1, 'MISSING_CRITICAL'],
      ['CCR-PRJ-PROD-BATH-0001-TILE', 'PRJ-PROD-BATH-0001', 'tile_installation', 'tile', '600각 폴리싱 타일 실제 공급가', 'PURCHASE_ORDER_READY', 'RED', 'purchaseOrder', 1, 1, 'MISSING_CRITICAL'],
      ['CCR-PRJ-PROD-BATH-0001-TILE-ACCESSORY', 'PRJ-PROD-BATH-0001', 'tile_accessory_materials', 'tileAccessory', '타일 부자재 실제 원가', 'PURCHASE_ORDER_READY', 'RED', 'purchaseOrder', 1, 1, 'MISSING_CRITICAL'],
      ['CCR-PRJ-PROD-BATH-0001-LABOR', 'PRJ-PROD-BATH-0001', 'site_labor', 'labor', '실제 인건비 및 품수', 'DAILY_REPORT', 'RED', 'dailyReport', 0, 1, 'MISSING_CRITICAL'],
      ['CCR-PRJ-PROD-BATH-0001-TRANSPORT', 'PRJ-PROD-BATH-0001', 'transport', 'transport', '운반비 실제 원가', 'MATERIAL_DELIVERY', 'RED', 'siteInput', 1, 1, 'MISSING_CRITICAL'],
      ['CCR-PRJ-PROD-BATH-0001-MISC', 'PRJ-PROD-BATH-0001', 'misc_site_expense', 'miscellaneous', '기타 잡비 실제 원가', 'SITE_OPERATION', 'RED', 'siteInput', 0, 1, 'MISSING_CRITICAL'],
      ['CCR-PRJ-PROD-BATH-0001-KNOWN-BASELINE', 'PRJ-PROD-BATH-0001', 'completion_baseline', 'knownBaseline', '기존 완료 패키지 기준 원가', 'COMPLETION_BASELINE', 'GREEN', 'completionBaseline', 0, 1, 'CAPTURED']
    ].forEach((row) => insert.run(...row, createdAt, createdAt));

    db.project.prepare(`
      INSERT OR IGNORE INTO cost_capture_entries (
        entry_id, requirement_id, project_id, amount, quantity, unit,
        vendor_id, vendor_name_ko, source_document_ko, captured_by,
        captured_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'CCE-PRJ-PROD-BATH-0001-KNOWN-BASELINE',
      'CCR-PRJ-PROD-BATH-0001-KNOWN-BASELINE',
      'PRJ-PROD-BATH-0001',
      2850000,
      1,
      'LS',
      null,
      null,
      'Completion Closing Package',
      'BOC',
      createdAt,
      toJson({ notesKo: 'Completion Package에서 생성된 기존 원가 baseline. 핵심 원가 세부 항목은 별도 입력 필요.' })
    );

    recomputeCostCaptureStatus('PRJ-PROD-BATH-0001');

    db.project.prepare(`
      INSERT OR IGNORE INTO cost_leak_analysis (
        analysis_id, project_id, leak_type, title_ko, reason_ko, severity,
        related_requirement_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'CLA-PRJ-PROD-BATH-0001-CORE-MISSING',
      'PRJ-PROD-BATH-0001',
      'missingCriticalCost',
      '핵심 원가 7개 항목 미입력',
      '철거, 폐기물, 타일, 타일 부자재, 인건비, 운반비, 기타 잡비가 Completion 전에 캡처되어야 합니다.',
      'RED',
      null,
      'Completion 전 실제 원가 입력',
      createdAt
    );
  }

  function hoursSince(isoDate) {
    if (!isoDate) return 0;
    const time = new Date(isoDate).getTime();
    if (!Number.isFinite(time)) return 0;
    return Math.max(0, (Date.now() - time) / 36e5);
  }

  function eventLevelToNotificationLevel(severity) {
    return severity === 'RED' || severity === 'BLOCKING' ? 'RED' : severity === 'YELLOW' || severity === 'WARNING' ? 'WARNING' : 'INFO';
  }

  function upsertEventTrigger(event) {
    const existing = db.logs.prepare('SELECT * FROM event_triggers WHERE trigger_key = ?').get(event.triggerKey);
    const detectedAt = nowIso();
    const triggerId = existing?.trigger_id || `EVT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    db.logs.prepare(`
      INSERT OR REPLACE INTO event_triggers (
        trigger_id, trigger_key, event_type, event_category, severity, project_id,
        title_ko, message_ko, next_action_ko, blocking_required, status,
        detected_at, resolved_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      triggerId,
      event.triggerKey,
      event.eventType,
      event.eventCategory,
      event.severity,
      event.projectId || 'GLOBAL',
      event.titleKo,
      event.messageKo,
      event.nextActionKo,
      event.blockingRequired ? 1 : 0,
      'ACTIVE',
      existing?.detected_at || detectedAt,
      null,
      toJson(event.payload || {})
    );

    if (!existing || existing.status !== 'ACTIVE') {
      db.logs.prepare(`
        INSERT INTO notification_logs (
          log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LOG-EVT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        eventLevelToNotificationLevel(event.severity),
        event.messageKo,
        event.projectId || 'GLOBAL',
        event.nextActionKo,
        detectedAt
      );
    }

    return triggerId;
  }

  function detectAutomationEvents() {
    const events = [];

    db.project.prepare(`
      SELECT *
      FROM payment_milestones
      WHERE amount_status NOT IN ('PAID', 'RECEIVED', 'COMPLETED')
    `).all().forEach((row) => {
      const ageHours = hoursSince(row.created_at);
      const isDeposit = row.milestone_type === 'DEPOSIT' || row.display_name_ko.includes('계약금');
      const severity = isDeposit && ageHours >= 24 ? 'RED' : ageHours >= 24 ? 'YELLOW' : 'INFO';
      if (severity === 'INFO') return;
      events.push({
        triggerKey: `PAYMENT-${row.milestone_id}`,
        eventType: isDeposit ? 'DEPOSIT_UNPAID_24H' : 'PAYMENT_DELAY',
        eventCategory: 'Payment',
        severity,
        projectId: row.project_id,
        titleKo: isDeposit ? '계약금 미입금' : `${row.display_name_ko} 지연`,
        messageKo: isDeposit ? '계약금 미입금 24시간 경과: 실행 전환을 차단해야 합니다.' : `${row.display_name_ko} 입금/청구 상태 확인이 필요합니다.`,
        nextActionKo: isDeposit ? 'Execution 차단' : '수금 확인',
        blockingRequired: isDeposit,
        payload: { milestoneId: row.milestone_id, ageHours, amountStatus: row.amount_status }
      });
    });

    db.project.prepare(`
      SELECT *
      FROM purchase_orders
      WHERE order_status NOT IN ('ORDERED', 'DELIVERED', 'COMPLETED')
    `).all().forEach((row) => {
      const ageHours = hoursSince(row.created_at);
      if (ageHours < 48 && !row.unknown_price_warning) return;
      events.push({
        triggerKey: `PROCUREMENT-${row.purchase_order_id}`,
        eventType: ageHours >= 48 ? 'PURCHASE_ORDER_PENDING_48H' : 'PURCHASE_ORDER_PRICE_WARNING',
        eventCategory: 'Procurement',
        severity: ageHours >= 48 ? 'YELLOW' : 'WARNING',
        projectId: row.project_id,
        titleKo: '발주 필요 상태 지속',
        messageKo: ageHours >= 48 ? '발주 필요 상태가 48시간 이상 유지되었습니다.' : '발주서에 UNKNOWN / NEEDS_RESEARCH 단가가 남아 있습니다.',
        nextActionKo: '발주 확인',
        blockingRequired: false,
        payload: { purchaseOrderId: row.purchase_order_id, ageHours, orderStatus: row.order_status, unknownPriceWarning: Boolean(row.unknown_price_warning) }
      });
    });

    db.project.prepare(`
      SELECT *
      FROM inspection_results
      WHERE result_status = 'FAIL'
    `).all().forEach((row) => {
      const ageHours = hoursSince(row.created_at);
      events.push({
        triggerKey: `INSPECTION-FAIL-${row.inspection_result_id}`,
        eventType: ageHours >= 24 ? 'INSPECTION_FAIL_UNRESOLVED_24H' : 'INSPECTION_FAIL',
        eventCategory: 'Site',
        severity: 'RED',
        projectId: row.project_id,
        titleKo: '검수 FAIL',
        messageKo: ageHours >= 24 ? '검수 FAIL 후 24시간 이상 미조치 상태입니다.' : '검수 FAIL 발생: 후속 공정을 차단해야 합니다.',
        nextActionKo: '후속 공정 차단',
        blockingRequired: true,
        payload: { inspectionResultId: row.inspection_result_id, relatedProcessId: row.related_process_id, blockedProcesses: fromJson(row.blocked_processes_json, []), ageHours }
      });
    });

    db.project.prepare('SELECT * FROM cost_capture_status').all().forEach((row) => {
      if (row.missing_critical_count > 0) {
        events.push({
          triggerKey: `COST-MISSING-${row.project_id}`,
          eventType: 'ACTUAL_COST_MISSING',
          eventCategory: 'Cost',
          severity: 'RED',
          projectId: row.project_id,
          titleKo: '실제 원가 미입력',
          messageKo: `핵심 원가 ${row.missing_critical_count}건 미입력: Completion 승인을 차단합니다.`,
          nextActionKo: '원가 입력',
          blockingRequired: true,
          payload: { missingCriticalCount: row.missing_critical_count, completionBlocked: Boolean(row.completion_blocked) }
        });
      }

      if (Number(row.forecast_margin_rate || 0) < 0.2) {
        events.push({
          triggerKey: `MARGIN-COLLAPSE-${row.project_id}`,
          eventType: 'MARGIN_UNDER_20',
          eventCategory: 'Cost',
          severity: 'RED',
          projectId: row.project_id,
          titleKo: '마진 붕괴',
          messageKo: `현재 예상 마진율 ${(Number(row.forecast_margin_rate || 0) * 100).toFixed(1)}%: Completion 승인을 차단합니다.`,
          nextActionKo: '마진 원인 분석',
          blockingRequired: true,
          payload: { forecastMargin: row.forecast_margin, forecastMarginRate: row.forecast_margin_rate }
        });
      }
    });

    db.project.prepare(`
      SELECT *
      FROM live_margin_snapshots
      WHERE alert_level = 'RED'
      ORDER BY created_at DESC
      LIMIT 10
    `).all().forEach((row) => {
      events.push({
        triggerKey: `LIVE-MARGIN-${row.snapshot_id}`,
        eventType: 'LIVE_MARGIN_RED_ALERT',
        eventCategory: 'Cost',
        severity: 'RED',
        projectId: row.project_id,
        titleKo: '실시간 마진 RED ALERT',
        messageKo: `최초 견적 대비 마진율 하락폭 ${(Number(row.margin_drop_rate || 0) * 100).toFixed(1)}%p 감지.`,
        nextActionKo: 'Cost Leak 확인',
        blockingRequired: true,
        payload: { snapshotId: row.snapshot_id, marginDropRate: row.margin_drop_rate, currentForecastMarginRate: row.current_forecast_margin_rate }
      });
    });

    db.project.prepare(`
      SELECT *
      FROM leads
      WHERE consultation_status = 'NEW'
    `).all().forEach((row) => {
      const ageHours = hoursSince(row.created_at);
      if (ageHours < 24) return;
      events.push({
        triggerKey: `LEAD-NEW-NO-RESPONSE-${row.lead_id}`,
        eventType: 'LEAD_NEW_NO_RESPONSE_24H',
        eventCategory: 'Sales',
        severity: ageHours >= 48 ? 'RED' : 'YELLOW',
        projectId: 'SALES',
        titleKo: '신규 리드 미응답',
        messageKo: `${row.customer_name_ko} 리드가 ${Math.floor(ageHours)}시간 동안 상담 처리되지 않았습니다.`,
        nextActionKo: '즉시 1차 연락',
        blockingRequired: false,
        payload: { leadId: row.lead_id, ageHours, sourceChannel: row.source_channel, interestedScope: row.interested_scope }
      });
    });

    db.project.prepare(`
      SELECT *
      FROM leads
      WHERE consultation_status = 'ESTIMATE_SENT'
    `).all().forEach((row) => {
      const ageHours = hoursSince(row.updated_at);
      if (ageHours < 72) return;
      events.push({
        triggerKey: `LEAD-ESTIMATE-FOLLOWUP-${row.lead_id}`,
        eventType: 'LEAD_ESTIMATE_SENT_NO_RESPONSE_3D',
        eventCategory: 'Sales',
        severity: 'YELLOW',
        projectId: 'SALES',
        titleKo: '견적 발송 후 미응답',
        messageKo: `${row.customer_name_ko} 고객에게 견적 발송 후 3일 이상 후속 상담이 없습니다.`,
        nextActionKo: 'Follow-up 연락',
        blockingRequired: false,
        payload: { leadId: row.lead_id, ageHours, expectedBudget: row.expected_budget }
      });
    });

    db.project.prepare(`
      SELECT *
      FROM leads
      WHERE consultation_status = 'LOST'
        AND lead_id NOT IN (SELECT lead_id FROM lost_reason_logs)
    `).all().forEach((row) => {
      events.push({
        triggerKey: `LEAD-LOST-REASON-MISSING-${row.lead_id}`,
        eventType: 'LEAD_LOST_REASON_MISSING',
        eventCategory: 'Sales',
        severity: 'RED',
        projectId: 'SALES',
        titleKo: 'LOST 사유 누락',
        messageKo: `${row.customer_name_ko} 리드가 LOST 상태지만 실패 사유가 기록되지 않았습니다.`,
        nextActionKo: 'LOST 사유 입력',
        blockingRequired: true,
        payload: { leadId: row.lead_id, expectedBudget: row.expected_budget }
      });
    });

    return events;
  }

  function runAutomationScheduler(jobType = 'EVENT_SWEEP_5M') {
    const startedAt = nowIso();
    const job = db.logs.prepare('SELECT * FROM scheduled_jobs WHERE job_type = ? AND enabled = 1').get(jobType)
      || db.logs.prepare('SELECT * FROM scheduled_jobs WHERE job_id = ?').get('JOB-AUTOMATION-5M');
    const events = detectAutomationEvents();
    events.forEach(upsertEventTrigger);
    const finishedAt = nowIso();
    if (job) {
      db.logs.prepare(`
        INSERT INTO job_execution_logs (
          execution_id, job_id, started_at, finished_at, status, detected_event_count, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `JOBRUN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        job.job_id,
        startedAt,
        finishedAt,
        'COMPLETED',
        events.length,
        toJson({ eventKeys: events.map((event) => event.triggerKey) })
      );
      db.logs.prepare(`
        UPDATE scheduled_jobs
        SET last_run_at = ?, next_run_at = ?, updated_at = ?
        WHERE job_id = ?
      `).run(finishedAt, new Date(Date.now() + Number(job.interval_minutes || 5) * 60000).toISOString(), finishedAt, job.job_id);
    }
    return events;
  }

  function getActiveAutomationEvents(limit = 20) {
    return db.logs.prepare(`
      SELECT *
      FROM event_triggers
      WHERE status = 'ACTIVE'
      ORDER BY
        CASE severity WHEN 'RED' THEN 0 WHEN 'BLOCKING' THEN 0 WHEN 'YELLOW' THEN 1 WHEN 'WARNING' THEN 1 ELSE 2 END,
        detected_at DESC
      LIMIT ?
    `).all(limit);
  }

  function getDashboardData() {
    syncCostLeakRootCauses(null, nowIso());
    runAutomationScheduler('EVENT_SWEEP_5M');
    syncPortfolioProjects();
    detectResourceConflicts();
    const projects = db.project.prepare('SELECT * FROM projects ORDER BY risk_score DESC').all().map((row) => ({
      projectId: row.project_id,
      projectNameKo: row.project_name_ko,
      currentProcessKo: row.current_process_ko,
      todayTasksKo: fromJson(row.today_tasks_json, []),
      deadline: row.deadline,
      riskScore: row.risk_score,
      riskLevel: row.risk_level,
      profitRate: row.profit_rate,
      receivableAmount: row.receivable_amount,
      progressRate: row.progress_rate,
      remainingDays: row.remaining_days,
      receivableStatusKo: row.receivable_status_ko,
      defectRiskKo: row.defect_risk_ko,
      nextActionKo: row.next_action_ko
    }));

    const approvals = db.approval.prepare('SELECT * FROM approvals ORDER BY requested_at DESC').all().map((row) => ({
      approvalId: row.approval_id,
      projectId: row.project_id,
      approvalType: row.approval_type,
      titleKo: row.title_ko,
      reasonKo: row.reason_ko,
      status: row.status,
      rollbackRequired: Boolean(row.rollback_required),
      rollbackStatus: row.rollback_status,
      blockingImpactKo: row.blocking_impact_ko
    }));

    const estimateVsActualTop = db.project.prepare('SELECT * FROM estimate_vs_actual ORDER BY created_at DESC LIMIT 10').all().map((row, index) => ({
      rank: index + 1,
      itemNameKo: row.item_name_ko,
      varianceType: row.variance_type,
      reasonKo: row.reason_ko,
      actionKo: row.action_ko
    }));

    const repeatedDefectsTop = db.project.prepare('SELECT * FROM repeated_defects ORDER BY created_at DESC LIMIT 10').all().map((row, index) => ({
      rank: index + 1,
      itemNameKo: row.defect_name_ko,
      varianceType: 'defectFrequency',
      reasonKo: row.reason_ko,
      actionKo: row.action_ko
    }));

    const repeatedLossProcessTop = db.project.prepare('SELECT * FROM repeated_loss_processes ORDER BY created_at DESC LIMIT 10').all().map((row, index) => ({
      rank: index + 1,
      itemNameKo: row.process_name_ko,
      varianceType: 'processLoss',
      reasonKo: row.reason_ko,
      actionKo: row.action_ko
    }));

    const notificationLog = db.logs.prepare('SELECT * FROM notification_logs ORDER BY created_at DESC, time_label DESC LIMIT 20').all().map((row) => ({
      logId: row.log_id,
      time: row.time_label,
      level: row.level,
      messageKo: row.message_ko,
      relatedProjectId: row.related_project_id,
      actionKo: row.action_ko
    }));

    const profitSummary = getProfitGenerationSummary();
    const profitTemplates = db.project.prepare('SELECT * FROM profit_templates ORDER BY margin DESC, created_at DESC LIMIT 20').all().map((row) => ({
      id: row.id,
      projectType: row.project_type,
      areaRange: row.area_range,
      costStructure: fromJson(row.cost_structure_json, {}),
      crewStructure: fromJson(row.crew_structure_json, {}),
      duration: row.duration,
      margin: row.margin,
      createdAt: row.created_at
    }));
    const profitAlerts = db.project.prepare(`
      SELECT *
      FROM profit_decisions
      WHERE decision IN ('BLOCK', 'MODIFY')
      ORDER BY created_at DESC
      LIMIT 10
    `).all().map((row) => ({
      id: row.id,
      estimateId: row.estimate_id,
      decision: row.decision,
      realMargin: row.real_margin,
      revenue: row.revenue,
      totalCost: row.total_cost,
      riskBuffer: row.risk_buffer,
      createdAt: row.created_at
    }));

    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      topBar: buildTopBar(projects),
      projects,
      redAlerts: buildRedAlerts(),
      approvals,
      immediateActions: buildImmediateActions(),
      profitSummary,
      profitAlerts,
      profitTemplates,
      estimateVsActualTop,
      repeatedDefectsTop,
      repeatedLossProcessTop,
      notificationLog
    };
  }

  function getPortfolioDashboardData() {
    syncPortfolioProjects();
    detectResourceConflicts();
    const portfolioProjects = db.project.prepare(`
      SELECT pp.*, p.project_name_ko, p.current_process_ko, p.progress_rate, p.remaining_days, p.next_action_ko
      FROM portfolio_projects pp
      JOIN projects p ON p.project_id = pp.project_id
      ORDER BY pp.red_alert_count DESC, pp.expected_margin_rate ASC, pp.end_date
    `).all();
    const allocations = db.project.prepare('SELECT * FROM resource_allocations ORDER BY start_date, resource_name_ko').all();
    const conflicts = db.project.prepare("SELECT * FROM resource_conflicts WHERE status = 'ACTIVE' ORDER BY detected_at DESC").all();
    const cashflows = db.project.prepare('SELECT * FROM portfolio_cashflow ORDER BY expected_date').all();

    const totalRevenue = portfolioProjects.reduce((sum, row) => sum + Number(row.revenue_amount || 0), 0);
    const totalCost = portfolioProjects.reduce((sum, row) => sum + Number(row.cost_amount || 0), 0);
    const totalExpectedMargin = portfolioProjects.reduce((sum, row) => sum + Number(row.expected_margin || 0), 0);
    const activeProjectCount = portfolioProjects.filter((row) => !['COMPLETED'].includes(row.project_status)).length;
    const redAlertProjectCount = portfolioProjects.filter((row) => Number(row.red_alert_count || 0) > 0 || ['BLOCKING', 'HIGH'].includes(row.risk_level)).length;
    const totalInflow = cashflows.filter((row) => row.cashflow_type === 'INFLOW').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const totalOutflow = cashflows.filter((row) => row.cashflow_type === 'OUTFLOW').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const netCashflow = totalInflow - totalOutflow;

    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      kpis: {
        totalRevenue,
        totalCost,
        totalExpectedMargin,
        totalExpectedMarginRate: totalRevenue > 0 ? totalExpectedMargin / totalRevenue : 0,
        activeProjectCount,
        redAlertProjectCount,
        resourceConflictCount: conflicts.length,
        totalInflow,
        totalOutflow,
        netCashflow,
        futureCashShortageRisk: netCashflow < 0 || cashflows.some((row) => row.cashflow_status === 'OVERDUE')
      },
      statusGroups: ['PRELIMINARY', 'FINAL_ESTIMATE', 'EXECUTION_READY', 'IN_PROGRESS', 'COMPLETED'].map((status) => ({
        status,
        count: portfolioProjects.filter((row) => row.project_status === status).length
      })),
      projects: portfolioProjects.map((row) => ({
        portfolioProjectId: row.portfolio_project_id,
        projectId: row.project_id,
        projectNameKo: row.project_name_ko,
        projectStatus: row.project_status,
        currentProcessKo: row.current_process_ko,
        revenueAmount: row.revenue_amount,
        costAmount: row.cost_amount,
        expectedMargin: row.expected_margin,
        expectedMarginRate: row.expected_margin_rate,
        riskLevel: row.risk_level,
        redAlertCount: row.red_alert_count,
        progressRate: row.progress_rate,
        remainingDays: row.remaining_days,
        nextActionKo: row.next_action_ko,
        startDate: row.start_date,
        endDate: row.end_date
      })),
      resourceAllocations: allocations.map((row) => ({
        allocationId: row.allocation_id,
        resourceId: row.resource_id,
        resourceNameKo: row.resource_name_ko,
        resourceRole: row.resource_role,
        projectId: row.project_id,
        allocationStatus: row.allocation_status,
        startDate: row.start_date,
        endDate: row.end_date,
        allocationRate: row.allocation_rate,
        notesKo: row.notes_ko
      })),
      resourceConflicts: conflicts.map((row) => ({
        conflictId: row.conflict_id,
        resourceId: row.resource_id,
        resourceNameKo: row.resource_name_ko,
        conflictType: row.conflict_type,
        severity: row.severity,
        projectIds: fromJson(row.project_ids_json, []),
        conflictDateRange: fromJson(row.conflict_date_range_json, {}),
        messageKo: row.message_ko,
        status: row.status
      })),
      cashflow: cashflows.map((row) => ({
        cashflowId: row.cashflow_id,
        projectId: row.project_id,
        cashflowType: row.cashflow_type,
        amount: row.amount,
        expectedDate: row.expected_date,
        actualDate: row.actual_date,
        cashflowStatus: row.cashflow_status,
        sourceType: row.source_type,
        notesKo: row.notes_ko
      })),
      portfolioRisks: portfolioProjects
        .filter((row) => Number(row.red_alert_count || 0) > 0 || ['BLOCKING', 'HIGH'].includes(row.risk_level))
        .map((row) => ({
          projectId: row.project_id,
          projectNameKo: row.project_name_ko,
          riskLevel: row.risk_level,
          redAlertCount: row.red_alert_count,
          nextActionKo: row.next_action_ko
        }))
    };
  }

  function getCrewDashboardData() {
    seedCrewHrManagementLayer();
    const members = db.project.prepare('SELECT * FROM crew_members ORDER BY crew_type, member_name_ko').all();
    const skills = db.project.prepare('SELECT * FROM crew_skills ORDER BY crew_member_id, process_name_ko').all();
    const allocations = db.project.prepare(`
      SELECT a.*, m.member_name_ko, m.crew_type, m.role, m.daily_wage
      FROM crew_allocations a
      JOIN crew_members m ON m.crew_member_id = a.crew_member_id
      ORDER BY a.planned_start_date, m.member_name_ko
    `).all();
    const attendance = db.project.prepare('SELECT * FROM crew_attendance ORDER BY work_date DESC LIMIT 50').all();
    const performance = db.project.prepare('SELECT * FROM crew_performance ORDER BY updated_at DESC LIMIT 50').all();
    const laborCosts = db.project.prepare('SELECT * FROM labor_cost_records ORDER BY updated_at DESC LIMIT 50').all();
    const risks = db.project.prepare("SELECT * FROM crew_risk_logs WHERE status = 'ACTIVE' ORDER BY severity DESC, created_at DESC").all();
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const todayCrew = allocations.filter((row) => row.planned_start_date <= today && row.planned_end_date >= today);
    const tomorrowCrew = allocations.filter((row) => row.planned_start_date <= tomorrow && row.planned_end_date >= tomorrow);
    const plannedLaborCost = laborCosts.reduce((sum, row) => sum + Number(row.planned_labor_cost || 0), 0);
    const actualLaborCost = laborCosts.reduce((sum, row) => sum + Number(row.actual_labor_cost || 0), 0);
    const missingLaborCostCount = laborCosts.filter((row) => row.cost_status === 'PENDING_CAPTURE').length;
    const overrunCount = laborCosts.filter((row) => row.cost_status === 'OVER_BASELINE').length;

    return {
      snapshotDate: today,
      kpis: {
        totalCrewCount: members.length,
        todayCrewCount: todayCrew.length,
        tomorrowCrewCount: tomorrowCrew.length,
        activeAllocationCount: allocations.filter((row) => ['ALLOCATED', 'PLANNED'].includes(row.allocation_status)).length,
        crewRiskCount: risks.length,
        missingLaborCostCount,
        laborOverrunCount: overrunCount,
        plannedLaborCost,
        actualLaborCost,
        laborCostVariance: actualLaborCost > 0 ? actualLaborCost - plannedLaborCost : 0
      },
      members: members.map((row) => ({
        crewMemberId: row.crew_member_id,
        memberNameKo: row.member_name_ko,
        crewType: row.crew_type,
        role: row.role,
        dailyWage: row.daily_wage,
        minimumLaborDay: row.minimum_labor_day,
        productivityStandard: fromJson(row.productivity_standard_json, {}),
        currentProjectId: row.current_project_id,
        availability: fromJson(row.availability_json, {}),
        reliabilityScore: row.reliability_score,
        defectHistoryCount: row.defect_history_count,
        absenceHistoryCount: row.absence_history_count,
        status: row.status,
        notesKo: row.notes_ko,
        skills: skills.filter((skill) => skill.crew_member_id === row.crew_member_id).map((skill) => ({
          processId: skill.process_id,
          processNameKo: skill.process_name_ko,
          skillLevel: skill.skill_level,
          productivityUnit: skill.productivity_unit,
          productivityValue: skill.productivity_value
        }))
      })),
      allocations: allocations.map((row) => ({
        crewAllocationId: row.crew_allocation_id,
        crewMemberId: row.crew_member_id,
        memberNameKo: row.member_name_ko,
        crewType: row.crew_type,
        role: row.role,
        projectId: row.project_id,
        processId: row.process_id,
        processNameKo: row.process_name_ko,
        allocationStatus: row.allocation_status,
        plannedStartDate: row.planned_start_date,
        plannedEndDate: row.planned_end_date,
        plannedLaborDay: row.planned_labor_day,
        actualLaborDay: row.actual_labor_day,
        plannedLaborCost: row.planned_labor_cost,
        actualLaborCost: row.actual_labor_cost,
        costCaptureRequirementId: row.cost_capture_requirement_id
      })),
      attendance: attendance.map((row) => ({
        attendanceId: row.attendance_id,
        crewMemberId: row.crew_member_id,
        projectId: row.project_id,
        workDate: row.work_date,
        attendanceStatus: row.attendance_status,
        laborDay: row.labor_day,
        notesKo: row.notes_ko
      })),
      performance: performance.map((row) => ({
        performanceId: row.performance_id,
        crewMemberId: row.crew_member_id,
        projectId: row.project_id,
        processId: row.process_id,
        plannedQuantity: row.planned_quantity,
        actualQuantity: row.actual_quantity,
        plannedLaborDay: row.planned_labor_day,
        actualLaborDay: row.actual_labor_day,
        productivityScore: row.productivity_score,
        defectCount: row.defect_count,
        reworkRequired: Boolean(row.rework_required),
        notesKo: row.notes_ko
      })),
      laborCosts: laborCosts.map((row) => ({
        laborCostRecordId: row.labor_cost_record_id,
        crewAllocationId: row.crew_allocation_id,
        crewMemberId: row.crew_member_id,
        projectId: row.project_id,
        costCaptureEntryId: row.cost_capture_entry_id,
        plannedLaborCost: row.planned_labor_cost,
        actualLaborCost: row.actual_labor_cost,
        varianceAmount: row.variance_amount,
        varianceRate: row.variance_rate,
        costStatus: row.cost_status
      })),
      risks: risks.map((row) => ({
        crewRiskLogId: row.crew_risk_log_id,
        crewMemberId: row.crew_member_id,
        projectId: row.project_id,
        riskType: row.risk_type,
        severity: row.severity,
        messageKo: row.message_ko,
        status: row.status
      })),
      costCaptureLinks: laborCosts
        .filter((row) => row.cost_status === 'PENDING_CAPTURE' || row.cost_capture_entry_id)
        .map((row) => ({
          projectId: row.project_id,
          crewAllocationId: row.crew_allocation_id,
          costCaptureEntryId: row.cost_capture_entry_id,
          status: row.cost_status,
          messageKo: row.cost_status === 'PENDING_CAPTURE' ? '실제 품수/인건비 입력 필요' : 'Cost Capture 연결 완료'
        }))
    };
  }

  function saveEstimateDraft({ minimumInput, draft, actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'ESTIMATE_DRAFT_CREATE', actionType: 'SAVE_ESTIMATE_DRAFT', payload: { projectType: minimumInput?.projectType } });
    const createdAt = nowIso();
    const stamp = Date.now();
    const estimateDraftId = `EST-DRAFT-${stamp}`;
    const projectId = `PRJ-PRELIM-${stamp}`;
    const projectNameKo = `${minimumInput?.buildingType || '신규 현장'} ${minimumInput?.areaPyeong || '-'}평 예비 견적`;
    const needsConfirmationItems = draft?.needsConfirmation || [];
    const generatedProcesses = draft?.generatedProcesses || [];
    const conditionalProcesses = draft?.conditionalProcesses || [];
    const documentDrafts = draft?.documents || [];
    const missingPriceWarnings = draft?.missingPriceWarnings || [];
    const marginSafety = computeMarginSafetyFromMinimumInput(minimumInput);
    const leadId = minimumInput?.leadId || draft?.leadId || null;
    if (leadId) {
      const lead = db.project.prepare('SELECT * FROM leads WHERE lead_id = ?').get(leadId);
      const latestQualification = db.project.prepare('SELECT * FROM qualification_results WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1').get(leadId);
      const qualificationDecision = latestQualification?.decision || lead?.qualification_decision || 'CONDITIONAL';
      if (qualificationDecision === 'FAIL' && !minimumInput?.qualificationOverrideReason) {
        logProfitAutomationEvent({
          sourceModule: 'SalesBranching',
          triggerEvent: 'ESTIMATE_CREATE_BLOCKED',
          entityType: 'Lead',
          entityId: leadId,
          decision: 'BLOCK',
          reason: 'Qualification FAIL lead cannot create estimate without admin override.',
          beforeState: qualificationDecision,
          afterState: 'ESTIMATE_BLOCKED',
          createdAt
        });
        throw new Error('Estimate creation blocked: Qualification FAIL requires admin override.');
      }
      if (qualificationDecision === 'CONDITIONAL') {
        insertNotification({
          level: 'WARNING',
          messageKo: `Qualification CONDITIONAL: ${leadId} 견적 생성 전 대표 검토가 필요합니다.`,
          relatedProjectId: leadId,
          actionKo: 'Qualification Warning',
          createdAt
        });
      }
    }

    db.project.prepare(`
      INSERT INTO projects (
        project_id, project_name_ko, current_process_ko, today_tasks_json,
        deadline, risk_score, risk_level, profit_rate, receivable_amount,
        progress_rate, remaining_days, receivable_status_ko, defect_risk_ko,
        next_action_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      projectNameKo,
      '예비 견적 생성',
      toJson(['NEEDS_CONFIRMATION 확인', '단가 누락 검토', '문서 초안 검토']),
      '미정',
      needsConfirmationItems.length > 0 ? 68 : 42,
      needsConfirmationItems.length > 0 ? 'HIGH' : 'MEDIUM',
      '예비',
      'UNKNOWN',
      '0%',
      0,
      '수금 계획 초안',
      '확인 필요',
      '예비 견적 확인 및 대표 승인 대기',
      createdAt,
      createdAt
    );

    db.project.prepare(`
      INSERT INTO estimate_drafts (
        estimate_draft_id, project_id, project_name_ko, draft_status,
        preliminary_estimate_json, missing_price_warnings_json,
        estimated_cost, estimated_margin, estimated_margin_rate, margin_safety_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      estimateDraftId,
      projectId,
      projectNameKo,
      'PRELIMINARY',
      toJson({
        status: draft?.status || 'PRELIMINARY',
        priceStatus: draft?.priceStatus || 'UNKNOWN_PRICE_INCLUDED',
        amount: marginSafety.customerOfferPrice || 'UNKNOWN',
        marginSafety
      }),
      toJson(missingPriceWarnings),
      marginSafety.estimatedCost || 0,
      marginSafety.estimatedMargin || 0,
      marginSafety.estimatedMarginRate || 0,
      marginSafety.marginSafetyStatus || 'NOT_EVALUATED',
      createdAt,
      createdAt
    );

    if (leadId) {
      db.project.prepare('UPDATE estimate_drafts SET lead_id = ? WHERE estimate_draft_id = ?').run(leadId, estimateDraftId);
      linkLeadToEstimate({ leadId, estimateDraftId, estimateId: estimateDraftId, projectId, estimateStatus: 'PRELIMINARY' });
    }

    const profitDecision = marginSafety.customerOfferPrice && marginSafety.estimatedCost
      ? runProfitControlEngine({
        estimateId: estimateDraftId,
        revenue: marginSafety.customerOfferPrice,
        totalCost: marginSafety.estimatedCost,
        vendorRisk: 0,
        laborVariance: 0,
        scheduleRisk: 0,
        defectRisk: 0,
        createdAt
      })
      : null;
    const templateMatch = matchProfitTemplateForEstimate({
      estimateId: estimateDraftId,
      projectType: minimumInput?.projectType || minimumInput?.constructionScope || 'unknown',
      areaM2: minimumInput?.areaM2 || minimumInput?.area_m2 || 0,
      apply: true,
      createdAt
    });

    db.project.prepare(`
      INSERT INTO estimate_draft_inputs (
        estimate_draft_id, project_id, minimum_input_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(estimateDraftId, projectId, toJson(minimumInput), createdAt, createdAt);
    const preventionRules = syncEstimateMandatoryItems({ estimateDraftId, projectId, minimumInput, createdAt });

    const insertProcess = db.project.prepare(`
      INSERT INTO estimate_draft_processes (
        process_record_id, estimate_draft_id, project_id, process_id,
        process_name_ko, process_type, trigger_type, reason_ko, status,
        payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    generatedProcesses.forEach((process, index) => {
      insertProcess.run(
        `${estimateDraftId}-PROC-${index + 1}`,
        estimateDraftId,
        projectId,
        process.processId,
        process.displayNameKo,
        'GENERATED',
        process.triggerType,
        process.reasonKo,
        'PRELIMINARY',
        toJson(process),
        createdAt
      );
    });

    conditionalProcesses.forEach((process, index) => {
      insertProcess.run(
        `${estimateDraftId}-COND-${index + 1}`,
        estimateDraftId,
        projectId,
        process.processId,
        process.displayNameKo,
        'CONDITIONAL',
        'CONDITIONAL',
        process.conditionKo,
        process.status || 'NEEDS_CONFIRMATION',
        toJson(process),
        createdAt
      );
    });

    const insertConfirmation = db.project.prepare(`
      INSERT INTO estimate_draft_confirmations (
        confirmation_id, estimate_draft_id, project_id, question_ko,
        impact_ko, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertApproval = db.approval.prepare(`
      INSERT INTO approvals (
        approval_id, project_id, approval_type, title_ko, reason_ko, status,
        rollback_required, rollback_status, blocking_impact_ko, requested_by,
        requested_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    needsConfirmationItems.forEach((item, index) => {
      const confirmationId = `${estimateDraftId}-NC-${index + 1}`;
      insertConfirmation.run(
        confirmationId,
        estimateDraftId,
        projectId,
        item.questionKo,
        item.impactKo,
        'NEEDS_CONFIRMATION',
        createdAt
      );

      insertApproval.run(
        `APP-${estimateDraftId}-NC-${index + 1}`,
        projectId,
        'Exception',
        `예비 견적 확인 필요: ${item.questionKo}`,
        item.impactKo,
        'PENDING_CEO_APPROVAL',
        0,
        'NOT_REQUIRED',
        '확인 전 확정 견적 전환 금지',
        'BOC',
        createdAt,
        createdAt
      );
    });

    preventionRules
      .filter((rule) => rule.approval_required_on_remove)
      .forEach((rule) => {
        insertApproval.run(
          `APP-${estimateDraftId}-PREVENT-${rule.item_id}`,
          projectId,
          'Exception',
          `자동 포함 항목 보호: ${rule.item_name_ko}`,
          rule.reason_ko,
          'PENDING_CEO_APPROVAL',
          0,
          'NOT_REQUIRED',
          '해당 항목 삭제 시 대표 승인 필요',
          'BOC',
          createdAt,
          createdAt
        );
      });

    insertApproval.run(
      `APP-${estimateDraftId}-FINAL`,
      projectId,
      'EstimateApproval',
      `FINAL ESTIMATE 전환 검토: ${projectNameKo}`,
      'NEEDS_CONFIRMATION, 필수 단가, 고위험 공정, 수금 흐름, 예상 마진을 확인해야 합니다.',
      'PENDING_CEO_APPROVAL',
      1,
      'READY',
      '승인 전 FINAL ESTIMATE 생성 금지',
      'BOC',
      createdAt,
      createdAt
    );

    const insertDocument = db.project.prepare(`
      INSERT INTO estimate_draft_documents (
        document_record_id, estimate_draft_id, project_id, document_id,
        display_name_ko, audience_ko, status_ko, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    documentDrafts.forEach((document, index) => {
      insertDocument.run(
        `${estimateDraftId}-DOC-${index + 1}`,
        estimateDraftId,
        projectId,
        document.documentId,
        document.displayNameKo,
        document.audienceKo,
        document.statusKo,
        toJson(document),
        createdAt
      );
    });

    const insertWarning = db.project.prepare(`
      INSERT INTO estimate_draft_warnings (
        warning_id, estimate_draft_id, project_id, warning_ko, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    missingPriceWarnings.forEach((warning, index) => {
      insertWarning.run(`${estimateDraftId}-WARN-${index + 1}`, estimateDraftId, projectId, warning, 'OPEN', createdAt);
    });

    db.project.prepare(`
      INSERT INTO estimates (
        estimate_id, project_id, estimate_type, amount_text, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(estimateDraftId, projectId, 'PRELIMINARY', 'UNKNOWN', toJson({ minimumInput, draft }), createdAt);

    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-${stamp}-ESTIMATE`,
      new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      'INFO',
      `예비 견적 저장: ${projectNameKo}`,
      projectId,
      '저장',
      createdAt
    );

    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACTLOG-${stamp}-ESTIMATE`,
      'SAVE_ESTIMATE_DRAFT',
      actor,
      projectId,
      null,
      toJson({ estimateDraftId, status: 'PRELIMINARY' }),
      '예비 견적 저장',
      createdAt
    );

    return {
      dashboardData: getDashboardData(),
      savedDraft: {
        estimateDraftId,
        projectId,
        projectNameKo,
        status: 'PRELIMINARY',
        needsConfirmationCount: needsConfirmationItems.length,
        missingPriceWarningCount: missingPriceWarnings.length,
        profitDecision,
        templateMatch
      }
    };
  }

  function buildEstimateDraftPayload(row) {
    if (!row) return null;

    const inputRow = db.project.prepare('SELECT * FROM estimate_draft_inputs WHERE estimate_draft_id = ?').get(row.estimate_draft_id);
    const processRows = db.project.prepare('SELECT * FROM estimate_draft_processes WHERE estimate_draft_id = ? ORDER BY created_at, process_record_id').all(row.estimate_draft_id);
    const confirmationRows = db.project.prepare('SELECT * FROM estimate_draft_confirmations WHERE estimate_draft_id = ? ORDER BY created_at, confirmation_id').all(row.estimate_draft_id);
    const documentRows = db.project.prepare('SELECT * FROM estimate_draft_documents WHERE estimate_draft_id = ? ORDER BY created_at, document_record_id').all(row.estimate_draft_id);
    const warningRows = db.project.prepare('SELECT * FROM estimate_draft_warnings WHERE estimate_draft_id = ? ORDER BY created_at, warning_id').all(row.estimate_draft_id);
    const mandatoryItems = getEstimateMandatoryItems(row.estimate_draft_id);

    const generatedProcesses = processRows
      .filter((process) => process.process_type === 'GENERATED')
      .map((process) => ({
        processId: process.process_id,
        displayNameKo: process.process_name_ko,
        triggerType: process.trigger_type,
        reasonKo: process.reason_ko
      }));

    const conditionalProcesses = processRows
      .filter((process) => process.process_type === 'CONDITIONAL')
      .map((process) => ({
        processId: process.process_id,
        displayNameKo: process.process_name_ko,
        conditionKo: process.reason_ko,
        status: process.status
      }));

    const needsConfirmation = confirmationRows.map((confirmation) => ({
      itemId: confirmation.confirmation_id,
      questionKo: confirmation.question_ko,
      impactKo: confirmation.impact_ko
    }));

    const documents = documentRows.map((document) => ({
      documentId: document.document_id,
      displayNameKo: document.display_name_ko,
      audienceKo: document.audience_ko,
      statusKo: document.status_ko
    }));
    const preliminaryEstimate = fromJson(row.preliminary_estimate_json, {});
    const marginSafety = preliminaryEstimate.marginSafety || {
      packageCode: fromJson(inputRow?.minimum_input_json, {}).bathroomPackage || 'BASIC',
      estimatedCost: row.estimated_cost || 0,
      customerOfferPrice: preliminaryEstimate.amount || 0,
      estimatedMargin: row.estimated_margin || 0,
      estimatedMarginRate: row.estimated_margin_rate || 0,
      marginSafetyStatus: row.margin_safety_status || 'NOT_EVALUATED',
      decisionKo: row.margin_safety_status || 'NOT_EVALUATED',
      reasonKo: '저장된 Margin Safety 계산값입니다.'
    };

    return {
      estimateDraftId: row.estimate_draft_id,
      projectId: row.project_id,
      projectNameKo: row.project_name_ko,
      draftStatus: row.draft_status,
      minimumInput: fromJson(inputRow?.minimum_input_json, {}),
      draft: {
        estimateId: row.estimate_draft_id,
        status: 'PRELIMINARY',
        priceStatus: 'UNKNOWN_PRICE_INCLUDED',
        marginSafety,
        generatedProcesses,
        conditionalProcesses,
        preventionItems: mandatoryItems,
        needsConfirmation,
        missingPriceWarnings: warningRows.map((warning) => warning.warning_ko),
        scheduleDraft: preliminaryEstimate.scheduleDraft || [],
        documents
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function loadEstimateDraftForProject({ projectId }) {
    const row = db.project.prepare('SELECT * FROM estimate_drafts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    return buildEstimateDraftPayload(row);
  }

  function diffEstimateDraft(beforeValue, afterValue) {
    const diff = {};
    const beforeText = JSON.stringify(beforeValue?.minimumInput || {});
    const afterText = JSON.stringify(afterValue?.minimumInput || {});
    if (beforeText !== afterText) diff.minimumInputChanged = true;

    const beforeConfirmations = JSON.stringify(beforeValue?.draft?.needsConfirmation || []);
    const afterConfirmations = JSON.stringify(afterValue?.draft?.needsConfirmation || []);
    if (beforeConfirmations !== afterConfirmations) diff.needsConfirmationChanged = true;

    const beforeDocuments = JSON.stringify(beforeValue?.draft?.documents || []);
    const afterDocuments = JSON.stringify(afterValue?.draft?.documents || []);
    if (beforeDocuments !== afterDocuments) diff.documentsChanged = true;

    const beforeWarnings = JSON.stringify(beforeValue?.draft?.missingPriceWarnings || []);
    const afterWarnings = JSON.stringify(afterValue?.draft?.missingPriceWarnings || []);
    if (beforeWarnings !== afterWarnings) diff.warningsChanged = true;

    return diff;
  }

  function getEstimateDraftIdFromApproval(approvalId) {
    if (!approvalId.startsWith('APP-') || !approvalId.endsWith('-FINAL')) return null;
    return approvalId.slice(4, -6);
  }

  function buildEstimateApprovalChecklist(estimateDraftId) {
    const draft = db.project.prepare('SELECT * FROM estimate_drafts WHERE estimate_draft_id = ?').get(estimateDraftId);
    if (!draft) return null;

    const confirmations = db.project.prepare('SELECT * FROM estimate_draft_confirmations WHERE estimate_draft_id = ?').all(estimateDraftId);
    const warnings = db.project.prepare('SELECT * FROM estimate_draft_warnings WHERE estimate_draft_id = ?').all(estimateDraftId);
    const processes = db.project.prepare('SELECT * FROM estimate_draft_processes WHERE estimate_draft_id = ?').all(estimateDraftId);
    const missingMandatoryItems = db.project.prepare(`
      SELECT *
      FROM estimate_mandatory_items
      WHERE estimate_draft_id = ? AND status != 'INCLUDED'
    `).all(estimateDraftId);
    const highRiskProcesses = processes.filter((process) => ['waterproofing', 'window_replacement', 'condensation_repair'].includes(process.process_id));

    const checklist = {
      needsConfirmationCompleted: confirmations.length === 0,
      requiredPriceCompleted: warnings.length === 0,
      highRiskProcessesChecked: highRiskProcesses.length === 0,
      paymentFlowChecked: true,
      marginRiskChecked: ['CEO_APPROVAL_REQUIRED', 'PASS', 'PRIORITY'].includes(draft.margin_safety_status),
      mandatoryPreventionIncluded: missingMandatoryItems.length === 0,
      marginSafetyStatus: draft.margin_safety_status,
      estimatedMarginRate: draft.estimated_margin_rate,
      estimatedMargin: draft.estimated_margin,
      marginSafetyRequiresCeoApproval: draft.margin_safety_status === 'CEO_APPROVAL_REQUIRED'
    };

    const blockingReasons = [];
    if (!checklist.mandatoryPreventionIncluded) {
      blockingReasons.push(`Root Cause Prevention 필수 포함 항목 누락: ${missingMandatoryItems.map((item) => item.item_name_ko).join(', ')}`);
    }
    if (!checklist.needsConfirmationCompleted) blockingReasons.push('NEEDS_CONFIRMATION 항목이 남아 있습니다.');
    if (!checklist.requiredPriceCompleted) blockingReasons.push('필수 단가 누락 경고가 남아 있습니다.');
    if (!checklist.highRiskProcessesChecked) blockingReasons.push('방수/창호/결로 등 고위험 공정 확인이 필요합니다.');
    if (draft.margin_safety_status === 'BLOCKED') blockingReasons.push('Margin Safety Rule 차단: 20% 미만 또는 최저 방어가 미달 견적입니다.');

    if (draft.margin_safety_status === 'NOT_EVALUATED') {
      blockingReasons.push('Margin Safety Rule 미검사: FINAL_ESTIMATE 승인 전 마진 안전 검사가 필요합니다.');
    }

    return { draft, checklist, blockingReasons };
  }

  function createFinalEstimate({ estimateDraftId, approvalId, actor, createdAt }) {
    const loaded = buildEstimateDraftPayload(db.project.prepare('SELECT * FROM estimate_drafts WHERE estimate_draft_id = ?').get(estimateDraftId));
    if (!loaded) throw new Error(`Estimate draft not found: ${estimateDraftId}`);

    const finalEstimateId = `FINAL-${estimateDraftId}`;
    const finalPayload = {
      finalEstimateId,
      sourceEstimateDraftId: estimateDraftId,
      projectId: loaded.projectId,
      status: 'FINAL_ESTIMATE',
      amount: 'UNKNOWN',
      priceStatus: 'UNKNOWN_PRICE_INCLUDED',
      customerDocumentStatus: 'FINAL_READY',
      internalDocumentStatus: 'FINAL_READY',
      orderPreparationStatus: 'READY_FOR_PURCHASE_REVIEW',
      schedulePreparationStatus: 'READY_FOR_SCHEDULE_CONFIRMATION',
      marginSafety: loaded.draft.marginSafety,
      masterDbUpdated: false
    };

    db.project.prepare(`
      INSERT OR REPLACE INTO final_estimates (
        final_estimate_id, estimate_draft_id, project_id, final_status,
        final_estimate_json, created_from_approval_id, rollback_data_json,
        estimated_cost, estimated_margin, estimated_margin_rate, margin_safety_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalEstimateId,
      estimateDraftId,
      loaded.projectId,
      'FINAL_ESTIMATE',
      toJson(finalPayload),
      approvalId,
      toJson({ sourceDraftStatus: loaded.draftStatus, rollbackAvailable: true }),
      loaded.draft.marginSafety?.estimatedCost || 0,
      loaded.draft.marginSafety?.estimatedMargin || 0,
      loaded.draft.marginSafety?.estimatedMarginRate || 0,
      loaded.draft.marginSafety?.marginSafetyStatus || 'NOT_EVALUATED',
      createdAt,
      createdAt
    );

    const documents = [
      { documentType: 'CUSTOMER_FINAL_ESTIMATE', displayNameKo: '고객용 견적서 확정본', audienceKo: '고객용' },
      { documentType: 'INTERNAL_FINAL_COST', displayNameKo: '내부 원가표 확정본', audienceKo: '내부용' },
      { documentType: 'PURCHASE_ORDER_READY', displayNameKo: '발주서 생성 준비', audienceKo: '현장/구매' },
      { documentType: 'SCHEDULE_CONFIRM_READY', displayNameKo: '공정표 확정 준비', audienceKo: '현장관리' }
    ];

    const insertDocument = db.project.prepare(`
      INSERT OR REPLACE INTO final_estimate_documents (
        final_document_id, final_estimate_id, project_id, document_type,
        display_name_ko, audience_ko, document_status, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    documents.forEach((document) => {
      insertDocument.run(
        `${finalEstimateId}-${document.documentType}`,
        finalEstimateId,
        loaded.projectId,
        document.documentType,
        document.displayNameKo,
        document.audienceKo,
        'FINAL_READY',
        toJson(document),
        createdAt
      );
    });

    db.project.prepare(`
      UPDATE estimate_drafts
      SET draft_status = 'FINAL_ESTIMATE', updated_at = ?
      WHERE estimate_draft_id = ?
    `).run(createdAt, estimateDraftId);

    db.project.prepare(`
      UPDATE projects
      SET current_process_ko = 'FINAL ESTIMATE 생성',
          next_action_ko = '계약/발주/공정표 확정 검토',
          progress_rate = '견적 확정',
          updated_at = ?
      WHERE project_id = ?
    `).run(createdAt, loaded.projectId);

    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-${Date.now()}-FINAL-ESTIMATE`,
      new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      'INFO',
      `FINAL ESTIMATE 생성: ${loaded.projectNameKo}`,
      loaded.projectId,
      '확정',
      createdAt
    );

    return finalPayload;
  }

  function handleEstimateApprovalDecision({ approval, decision, actor, reasonKo, createdAt }) {
    const estimateDraftId = getEstimateDraftIdFromApproval(approval.approval_id);
    if (!estimateDraftId) return null;

    const review = buildEstimateApprovalChecklist(estimateDraftId);
    if (!review) throw new Error(`Estimate approval target not found: ${estimateDraftId}`);

    const beforeStatus = review.draft.draft_status;
    let afterStatus = beforeStatus;
    let finalPayload = null;
    let effectiveDecision = decision;
    let effectiveReasonKo = reasonKo || decisionToKorean(decision);

    if (decision === 'APPROVED') {
      if (review.blockingReasons.length > 0) {
        effectiveDecision = 'REVISION_REQUESTED';
        afterStatus = 'PRELIMINARY';
        effectiveReasonKo = `FINAL 전환 차단: ${review.blockingReasons.join(' ')}`;
      } else {
        afterStatus = 'FINAL_ESTIMATE';
        finalPayload = createFinalEstimate({ estimateDraftId, approvalId: approval.approval_id, actor, createdAt });
      }
    } else if (decision === 'REJECTED') {
      afterStatus = 'PRELIMINARY';
    } else {
      afterStatus = 'PRELIMINARY';
    }

    db.project.prepare(`
      INSERT INTO estimate_approval_logs (
        approval_log_id, estimate_draft_id, project_id, approval_id,
        action_type, before_status, after_status, checklist_json,
        blocking_reasons_json, actor, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `EST-APPLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      estimateDraftId,
      approval.project_id,
      approval.approval_id,
      effectiveDecision,
      beforeStatus,
      afterStatus,
      toJson(review.checklist),
      toJson(review.blockingReasons),
      actor,
      effectiveReasonKo,
      createdAt
    );

    if (effectiveDecision !== decision) {
      return { effectiveDecision, effectiveReasonKo, finalPayload };
    }

    return { effectiveDecision: decision, effectiveReasonKo, finalPayload };
  }

  function updateEstimateDraft({ estimateDraftId, minimumInput, draft, actor = 'CEO', reasonKo = '예비 견적 수정 저장' }) {
    const row = db.project.prepare('SELECT * FROM estimate_drafts WHERE estimate_draft_id = ?').get(estimateDraftId);
    if (!row) {
      throw new Error(`Estimate draft not found: ${estimateDraftId}`);
    }

    const beforePayload = buildEstimateDraftPayload(row);
    const updatedAt = nowIso();
    const projectId = row.project_id;
    const marginSafety = computeMarginSafetyFromMinimumInput(minimumInput);
    const profitDecision = marginSafety.customerOfferPrice && marginSafety.estimatedCost
      ? runProfitControlEngine({
        estimateId: estimateDraftId,
        revenue: marginSafety.customerOfferPrice,
        totalCost: marginSafety.estimatedCost,
        vendorRisk: 0,
        laborVariance: 0,
        scheduleRisk: 0,
        defectRisk: 0,
        createdAt: updatedAt
      })
      : null;
    const templateMatch = matchProfitTemplateForEstimate({
      estimateId: estimateDraftId,
      projectType: minimumInput?.projectType || minimumInput?.constructionScope || 'unknown',
      areaM2: minimumInput?.areaM2 || minimumInput?.area_m2 || 0,
      apply: true,
      createdAt: updatedAt
    });
    const afterPayload = {
      ...beforePayload,
      minimumInput,
      draft: {
        ...draft,
        marginSafety,
        profitDecision,
        templateMatch,
        status: 'PRELIMINARY',
        priceStatus: 'UNKNOWN_PRICE_INCLUDED'
      },
      updatedAt
    };
    const diff = diffEstimateDraft(beforePayload, afterPayload);

    db.project.prepare(`
      UPDATE estimate_drafts
      SET draft_status = 'PRELIMINARY',
          preliminary_estimate_json = ?,
          missing_price_warnings_json = ?,
          estimated_cost = ?,
          estimated_margin = ?,
          estimated_margin_rate = ?,
          margin_safety_status = ?,
          updated_at = ?
      WHERE estimate_draft_id = ?
    `).run(
      toJson({
        status: 'PRELIMINARY',
        priceStatus: 'UNKNOWN_PRICE_INCLUDED',
        amount: marginSafety.customerOfferPrice || 'UNKNOWN',
        marginSafety,
        scheduleDraft: draft.scheduleDraft || []
      }),
      toJson(draft.missingPriceWarnings || []),
      marginSafety.estimatedCost || 0,
      marginSafety.estimatedMargin || 0,
      marginSafety.estimatedMarginRate || 0,
      marginSafety.marginSafetyStatus || 'NOT_EVALUATED',
      updatedAt,
      estimateDraftId
    );

    db.project.prepare(`
      UPDATE estimate_draft_inputs
      SET minimum_input_json = ?, updated_at = ?
      WHERE estimate_draft_id = ?
    `).run(toJson(minimumInput), updatedAt, estimateDraftId);
    syncEstimateMandatoryItems({ estimateDraftId, projectId, minimumInput, createdAt: updatedAt });

    db.project.prepare('DELETE FROM estimate_draft_confirmations WHERE estimate_draft_id = ?').run(estimateDraftId);
    const insertConfirmation = db.project.prepare(`
      INSERT INTO estimate_draft_confirmations (
        confirmation_id, estimate_draft_id, project_id, question_ko,
        impact_ko, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    (draft.needsConfirmation || []).forEach((item, index) => {
      insertConfirmation.run(
        item.itemId || `${estimateDraftId}-NC-${index + 1}`,
        estimateDraftId,
        projectId,
        item.questionKo,
        item.impactKo,
        'NEEDS_CONFIRMATION',
        updatedAt
      );
    });

    db.project.prepare('DELETE FROM estimate_draft_documents WHERE estimate_draft_id = ?').run(estimateDraftId);
    const insertDocument = db.project.prepare(`
      INSERT INTO estimate_draft_documents (
        document_record_id, estimate_draft_id, project_id, document_id,
        display_name_ko, audience_ko, status_ko, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    (draft.documents || []).forEach((document, index) => {
      insertDocument.run(
        `${estimateDraftId}-DOC-EDIT-${Date.now()}-${index + 1}`,
        estimateDraftId,
        projectId,
        document.documentId,
        document.displayNameKo,
        document.audienceKo,
        document.statusKo,
        toJson(document),
        updatedAt
      );
    });

    db.project.prepare('DELETE FROM estimate_draft_warnings WHERE estimate_draft_id = ?').run(estimateDraftId);
    const insertWarning = db.project.prepare(`
      INSERT INTO estimate_draft_warnings (
        warning_id, estimate_draft_id, project_id, warning_ko, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    (draft.missingPriceWarnings || []).forEach((warning, index) => {
      insertWarning.run(`${estimateDraftId}-WARN-EDIT-${Date.now()}-${index + 1}`, estimateDraftId, projectId, warning, 'OPEN', updatedAt);
    });

    db.project.prepare(`
      UPDATE projects
      SET today_tasks_json = ?,
          next_action_ko = ?,
          updated_at = ?
      WHERE project_id = ?
    `).run(
      toJson(['수정된 NEEDS_CONFIRMATION 검토', '예비 견적 재검토', '문서 초안 재확인']),
      '수정된 예비 견적 확인 필요',
      updatedAt,
      projectId
    );

    db.project.prepare(`
      INSERT INTO estimate_draft_change_logs (
        change_log_id, estimate_draft_id, project_id, change_type,
        before_json, after_json, diff_json, actor, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `EST-CHANGE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      estimateDraftId,
      projectId,
      'UPDATE',
      toJson(beforePayload),
      toJson(afterPayload),
      toJson(diff),
      actor,
      reasonKo,
      updatedAt
    );

    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACTLOG-${Date.now()}-ESTIMATE-UPDATE`,
      'UPDATE_ESTIMATE_DRAFT',
      actor,
      projectId,
      null,
      toJson({ estimateDraftId, diff }),
      reasonKo,
      updatedAt
    );

    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-${Date.now()}-ESTIMATE-UPDATE`,
      new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      'INFO',
      `예비 견적 수정 저장: ${row.project_name_ko}`,
      projectId,
      '수정 저장',
      updatedAt
    );

    return {
      dashboardData: getDashboardData(),
      savedDraft: {
        estimateDraftId,
        projectId,
        projectNameKo: row.project_name_ko,
        status: 'PRELIMINARY',
        updatedAt,
        diff
      }
    };
  }

  function getProjectExecutionReadiness({ projectId }) {
    const finalEstimate = db.project.prepare('SELECT * FROM final_estimates WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    const executionProject = db.project.prepare('SELECT * FROM execution_projects WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);

    if (!finalEstimate) {
      return {
        projectId,
        canTransition: false,
        executionStatus: executionProject?.execution_status || 'NOT_READY',
        blockingReasonsKo: ['FINAL_ESTIMATE가 없어 실행 전환할 수 없습니다.'],
        warningReasonsKo: [],
        documents: []
      };
    }

    const confirmations = db.project.prepare('SELECT * FROM estimate_draft_confirmations WHERE estimate_draft_id = ?').all(finalEstimate.estimate_draft_id);
    const finalPayload = fromJson(finalEstimate.final_estimate_json, {});
    const warningReasonsKo = [];
    if (finalPayload.amount === 'UNKNOWN' || finalPayload.priceStatus === 'UNKNOWN_PRICE_INCLUDED') {
      warningReasonsKo.push('단가 UNKNOWN / NEEDS_RESEARCH 항목이 있어 예비 실행 경고가 표시됩니다.');
    }

    const blockingReasonsKo = [];
    if (confirmations.length > 0) {
      blockingReasonsKo.push('필수 확인 항목이 남아 있습니다.');
    }

    if (finalEstimate.margin_safety_status === 'BLOCKED') {
      blockingReasonsKo.push('Margin Safety Rule 차단 상태에서는 실행 단계로 전환할 수 없습니다.');
    }

    const approvedContract = getApprovedContractForProject(projectId);
    if (!approvedContract) {
      blockingReasonsKo.push('계약서 승인 완료 전에는 EXECUTION_READY 전환이 금지됩니다.');
    }

    const documents = buildExecutionDocumentPreviews(warningReasonsKo);

    return {
      projectId,
      finalEstimateId: finalEstimate.final_estimate_id,
      contractId: approvedContract?.contract_id || null,
      canTransition: blockingReasonsKo.length === 0,
      executionStatus: executionProject?.execution_status || 'FINAL_ESTIMATE_READY',
      blockingReasonsKo,
      warningReasonsKo,
      documents
    };
  }

  function buildExecutionDocumentPreviews(warningReasonsKo = []) {
    var liveMarginSource = null && costStatus
      ? getLatestLiveMarginSnapshot(costStatus.project_id) || buildLiveMarginSnapshot(costStatus.project_id, costStatus.revenue, costStatus.captured_cost, costStatus.updated_at)
      : null;
    var liveMarginKpi = liveMarginSource
      ? {
          id: 'liveMarginRate',
          labelKo: '현재 예상 마진율',
          value: `${(Number(liveMarginSource.currentForecastMarginRate || 0) * 100).toFixed(1)}%`,
          helperKo: `하락폭 ${(Number(liveMarginSource.marginDropRate || 0) * 100).toFixed(1)}%p / 예상 잔여원가 ${Number(liveMarginSource.estimatedRemainingCost || 0).toLocaleString('ko-KR')}원`,
          severity: liveMarginSource.alertLevel,
          action: 'openCostCapture'
        }
      : { id: 'liveMarginRate', labelKo: '현재 예상 마진율', value: '0.0%', helperKo: '진행 중 프로젝트 없음', severity: 'GREEN', action: 'openCostCapture' };

    var liveMarginSource = null && costStatus
      ? getLatestLiveMarginSnapshot(costStatus.project_id) || buildLiveMarginSnapshot(costStatus.project_id, costStatus.revenue, costStatus.captured_cost, costStatus.updated_at)
      : null;
    var liveMarginKpi = liveMarginSource
      ? {
          id: 'liveMarginRate',
          labelKo: '현재 예상 마진율',
          value: `${(Number(liveMarginSource.currentForecastMarginRate || 0) * 100).toFixed(1)}%`,
          helperKo: `하락폭 ${(Number(liveMarginSource.marginDropRate || 0) * 100).toFixed(1)}%p / 예상 잔여원가 ${Number(liveMarginSource.estimatedRemainingCost || 0).toLocaleString('ko-KR')}원`,
          severity: liveMarginSource.alertLevel,
          action: 'openCostCapture'
        }
      : { id: 'liveMarginRate', labelKo: '현재 예상 마진율', value: '0.0%', helperKo: '진행 중 프로젝트 없음', severity: 'GREEN', action: 'openCostCapture' };

    const liveMarginSourceForTopBar = null
      ? getLatestLiveMarginSnapshot(costStatus.project_id) || buildLiveMarginSnapshot(costStatus.project_id, costStatus.revenue, costStatus.captured_cost, costStatus.updated_at)
      : null;
    var liveMarginKpi = liveMarginSourceForTopBar
      ? {
          id: 'liveMarginRate',
          labelKo: '현재 예상 마진율',
          value: `${(Number(liveMarginSourceForTopBar.currentForecastMarginRate || 0) * 100).toFixed(1)}%`,
          helperKo: `하락폭 ${(Number(liveMarginSourceForTopBar.marginDropRate || 0) * 100).toFixed(1)}%p / 예상 잔여원가 ${Number(liveMarginSourceForTopBar.estimatedRemainingCost || 0).toLocaleString('ko-KR')}원`,
          severity: liveMarginSourceForTopBar.alertLevel,
          action: 'openCostCapture'
        }
      : { id: 'liveMarginRate', labelKo: '현재 예상 마진율', value: '0.0%', helperKo: '진행 중 프로젝트 없음', severity: 'GREEN', action: 'openCostCapture' };

    return [
      {
        documentType: 'CONTRACT_PAYMENT_PLAN',
        displayNameKo: '계약/수금 계획',
        documentStatus: 'READY',
        warningsKo: [],
        payload: {
          milestones: [
            { type: 'DEPOSIT', displayNameKo: '계약금', triggerConditionKo: '계약 체결 시' },
            { type: 'INTERIM', displayNameKo: '중도금', triggerConditionKo: '철거/자재 발주/공정률 기준' },
            { type: 'BALANCE', displayNameKo: '잔금', triggerConditionKo: '준공검수 및 고객 인도 기준' }
          ]
        }
      },
      {
        documentType: 'PURCHASE_ORDER_DRAFT',
        displayNameKo: '발주서 초안',
        documentStatus: 'PRELIMINARY_READY',
        warningsKo: warningReasonsKo,
        payload: {
          priceStatus: 'UNKNOWN_PRICE_INCLUDED',
          orderPolicyKo: 'UNKNOWN / NEEDS_RESEARCH 항목은 발주 전 재확인'
        }
      },
      {
        documentType: 'CONFIRMED_SCHEDULE',
        displayNameKo: '공정표 확정본',
        documentStatus: 'READY',
        warningsKo: [],
        payload: {
          includesKo: ['선행/후행 관계', '발주 리드타임', '검수 포인트', '공정 충돌 경고']
        }
      },
      {
        documentType: 'DAILY_SITE_REPORT_TEMPLATE',
        displayNameKo: '공사일보 템플릿',
        documentStatus: 'READY',
        warningsKo: [],
        payload: {
          fieldsKo: ['오늘 공정', '투입 인력', '자재 입고', '사진 기록', '이슈/하자']
        }
      },
      {
        documentType: 'INSPECTION_CHECKLIST',
        displayNameKo: '검수 체크리스트',
        documentStatus: 'READY',
        warningsKo: [],
        payload: {
          checkpointsKo: ['방수 검수', '타일 검수', '전기/설비 검수', '준공 검수']
        }
      },
      {
        documentType: 'CLIENT_HANDOVER_CHECKLIST',
        displayNameKo: '고객 인도 체크리스트',
        documentStatus: 'READY',
        warningsKo: [],
        payload: {
          handoverKo: ['하자 확인', '사용 설명', '잔금 확인', 'A/S 안내']
        }
      },
      {
        documentType: 'CASHFLOW_PLAN',
        displayNameKo: '현금흐름표',
        documentStatus: 'READY',
        warningsKo: warningReasonsKo,
        payload: {
          linkedItemsKo: ['계약금', '중도금', '잔금', '자재비 지급', '외주 정산']
        }
      }
    ];
  }

  function transitionProjectToExecution({ projectId, actor = 'CEO', reasonKo = 'FINAL ESTIMATE 실행 전환' }) {
    requirePermission({ actor, permissionKey: 'EXECUTION_TRANSITION', actionType: 'TRANSITION_TO_EXECUTION_READY', payload: { projectId } });
    const readiness = getProjectExecutionReadiness({ projectId });
    if (!readiness.finalEstimateId) throw new Error('Execution transition blocked: FINAL_ESTIMATE is required.');
    if (!readiness.canTransition) throw new Error(`Execution transition blocked: ${readiness.blockingReasonsKo.join(' ')}`);

    const finalEstimate = db.project.prepare('SELECT * FROM final_estimates WHERE final_estimate_id = ?').get(readiness.finalEstimateId);
    const createdAt = nowIso();
    const executionProjectId = `EXEC-${readiness.finalEstimateId}`;
    const warningReasonsKo = readiness.warningReasonsKo || [];
    const existing = db.project.prepare('SELECT * FROM execution_projects WHERE execution_project_id = ?').get(executionProjectId);

    db.project.prepare(`
      INSERT OR REPLACE INTO execution_projects (
        execution_project_id, project_id, final_estimate_id, execution_status,
        preliminary_execution_warning, warning_reasons_json, created_from_approval_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM execution_projects WHERE execution_project_id = ?), ?), ?)
    `).run(
      executionProjectId,
      projectId,
      readiness.finalEstimateId,
      'EXECUTION_READY',
      warningReasonsKo.length > 0 ? 1 : 0,
      toJson(warningReasonsKo),
      finalEstimate.created_from_approval_id,
      executionProjectId,
      createdAt,
      createdAt
    );

    db.project.prepare('DELETE FROM execution_documents WHERE execution_project_id = ?').run(executionProjectId);
    const insertExecutionDocument = db.project.prepare(`
      INSERT INTO execution_documents (
        execution_document_id, execution_project_id, project_id, document_type,
        display_name_ko, document_status, warning_json, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    readiness.documents.forEach((document) => {
      insertExecutionDocument.run(
        `${executionProjectId}-${document.documentType}`,
        executionProjectId,
        projectId,
        document.documentType,
        document.displayNameKo,
        document.documentStatus,
        toJson(document.warningsKo || []),
        toJson(document.payload || {}),
        createdAt
      );
    });

    db.project.prepare(`
      INSERT OR REPLACE INTO purchase_orders (
        purchase_order_id, execution_project_id, project_id, order_status,
        unknown_price_warning, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `${executionProjectId}-PO-DRAFT`,
      executionProjectId,
      projectId,
      'DRAFT_READY',
      warningReasonsKo.length > 0 ? 1 : 0,
      toJson({ warningReasonsKo, source: 'FINAL_ESTIMATE' }),
      createdAt
    );

    const insertMilestone = db.project.prepare(`
      INSERT OR REPLACE INTO payment_milestones (
        milestone_id, execution_project_id, project_id, milestone_type,
        display_name_ko, trigger_condition_ko, amount_status, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['DEPOSIT', '계약금', '계약 체결 시'],
      ['INTERIM', '중도금', '철거/자재 발주/공정률 기준'],
      ['BALANCE', '잔금', '준공검수 및 고객 인도 기준']
    ].forEach(([type, displayNameKo, triggerConditionKo]) => {
      insertMilestone.run(
        `${executionProjectId}-${type}`,
        executionProjectId,
        projectId,
        type,
        displayNameKo,
        triggerConditionKo,
        'UNKNOWN',
        toJson({ source: 'execution_transition' }),
        createdAt
      );
    });

    db.project.prepare(`
      INSERT OR REPLACE INTO site_report_templates (
        template_id, execution_project_id, project_id, template_status, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(`${executionProjectId}-DAILY-REPORT`, executionProjectId, projectId, 'READY', toJson({ fieldsKo: ['공정', '인력', '자재', '사진', '이슈'] }), createdAt);

    const insertChecklist = db.project.prepare(`
      INSERT OR REPLACE INTO inspection_checklists (
        checklist_id, execution_project_id, project_id, checklist_type,
        display_name_ko, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    [
      ['WATERPROOF', '방수 검수 체크리스트'],
      ['FINAL', '준공 검수 체크리스트'],
      ['HANDOVER', '고객 인도 체크리스트']
    ].forEach(([type, displayNameKo]) => {
      insertChecklist.run(`${executionProjectId}-${type}`, executionProjectId, projectId, type, displayNameKo, toJson({ status: 'READY' }), createdAt);
    });

    db.project.prepare(`
      INSERT INTO execution_logs (
        execution_log_id, execution_project_id, project_id, action_type,
        before_status, after_status, actor, reason_ko, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `EXECLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      executionProjectId,
      projectId,
      'TRANSITION_TO_EXECUTION_READY',
      existing?.execution_status || 'FINAL_ESTIMATE',
      'EXECUTION_READY',
      actor,
      reasonKo,
      toJson({ warningReasonsKo, finalEstimateId: readiness.finalEstimateId }),
      createdAt
    );

    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACTLOG-${Date.now()}-EXECUTION`,
      'TRANSITION_TO_EXECUTION_READY',
      actor,
      projectId,
      finalEstimate.created_from_approval_id,
      toJson({ executionProjectId, warningReasonsKo }),
      reasonKo,
      createdAt
    );

    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-${Date.now()}-EXECUTION`,
      new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      warningReasonsKo.length > 0 ? 'WARNING' : 'INFO',
      warningReasonsKo.length > 0 ? '예비 실행 전환: UNKNOWN 단가 경고 포함' : '실행 전환 완료: EXECUTION_READY',
      projectId,
      '실행 전환',
      createdAt
    );

    db.project.prepare(`
      UPDATE projects
      SET current_process_ko = 'EXECUTION_READY',
          next_action_ko = '계약/수금/발주/공정 실행 준비',
          progress_rate = '실행 준비',
          updated_at = ?
      WHERE project_id = ?
    `).run(createdAt, projectId);

    return {
      dashboardData: getDashboardData(),
      executionProject: {
        executionProjectId,
        projectId,
        finalEstimateId: readiness.finalEstimateId,
        executionStatus: 'EXECUTION_READY',
        preliminaryExecutionWarning: warningReasonsKo.length > 0,
        warningReasonsKo,
        documentCount: readiness.documents.length
      }
    };
  }

  function getSiteOperationStatus({ projectId }) {
    const executionProject = db.project.prepare('SELECT * FROM execution_projects WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    const siteOperation = db.project.prepare('SELECT * FROM site_operations WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);

    if (!executionProject) {
      return {
        projectId,
        canStart: false,
        siteStatus: 'NOT_READY',
        blockingReasonsKo: ['EXECUTION_READY 프로젝트가 없어 현장 진행을 시작할 수 없습니다.'],
        progressRate: 0,
        blockedProcessesKo: [],
        riskFlagsKo: []
      };
    }

    const blockedProcessesKo = fromJson(siteOperation?.blocked_processes_json, []);
    const riskFlagsKo = fromJson(siteOperation?.risk_flags_json, []);

    return {
      projectId,
      executionProjectId: executionProject.execution_project_id,
      canStart: executionProject.execution_status === 'EXECUTION_READY' || siteOperation?.site_status === 'IN_PROGRESS',
      siteStatus: siteOperation?.site_status || executionProject.execution_status,
      blockingReasonsKo: [],
      progressRate: siteOperation?.overall_progress_rate || 0,
      blockedProcessesKo,
      riskFlagsKo
    };
  }

  function startSiteOperation({ projectId, actor = 'CEO', reasonKo = '현장 진행 시작' }) {
    const status = getSiteOperationStatus({ projectId });
    if (!status.executionProjectId) throw new Error('IN_PROGRESS transition blocked: EXECUTION_READY is required.');
    if (!status.canStart) throw new Error('IN_PROGRESS transition blocked: project is not EXECUTION_READY.');

    const createdAt = nowIso();
    const siteOperationId = `SITE-${status.executionProjectId}`;
    const existing = db.project.prepare('SELECT * FROM site_operations WHERE site_operation_id = ?').get(siteOperationId);

    db.project.prepare(`
      INSERT OR REPLACE INTO site_operations (
        site_operation_id, execution_project_id, project_id, site_status,
        overall_progress_rate, blocked_processes_json, risk_flags_json,
        started_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT started_at FROM site_operations WHERE site_operation_id = ?), ?), ?)
    `).run(
      siteOperationId,
      status.executionProjectId,
      projectId,
      'IN_PROGRESS',
      existing?.overall_progress_rate || 1,
      existing?.blocked_processes_json || toJson([]),
      existing?.risk_flags_json || toJson(['현장 진행 시작']),
      siteOperationId,
      createdAt,
      createdAt
    );

    db.project.prepare(`
      INSERT INTO execution_logs (
        execution_log_id, execution_project_id, project_id, action_type,
        before_status, after_status, actor, reason_ko, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `EXECLOG-${Date.now()}-SITE-START`,
      status.executionProjectId,
      projectId,
      'START_SITE_OPERATION',
      status.siteStatus,
      'IN_PROGRESS',
      actor,
      reasonKo,
      toJson({ siteOperationId }),
      createdAt
    );

    writeOperationalLog({
      actionType: 'START_SITE_OPERATION',
      actor,
      projectId,
      messageKo: '현장 진행 시작: IN_PROGRESS',
      actionKo: '현장 시작',
      level: 'INFO',
      payload: { siteOperationId },
      reasonKo,
      createdAt
    });

    db.project.prepare(`
      UPDATE projects
      SET current_process_ko = 'IN_PROGRESS',
          progress_rate = '1%',
          next_action_ko = '공사일보/입고/검수 관리',
          risk_score = CASE WHEN risk_score < 58 THEN 58 ELSE risk_score END,
          updated_at = ?
      WHERE project_id = ?
    `).run(createdAt, projectId);

    return {
      dashboardData: getDashboardData(),
      siteOperation: {
        siteOperationId,
        projectId,
        siteStatus: 'IN_PROGRESS',
        progressRate: existing?.overall_progress_rate || 1
      }
    };
  }

  function requireSiteOperation(projectId) {
    const siteOperation = db.project.prepare('SELECT * FROM site_operations WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    if (!siteOperation || siteOperation.site_status !== 'IN_PROGRESS') {
      throw new Error('Site operation is not IN_PROGRESS.');
    }
    return siteOperation;
  }

  function saveDailySiteReport({ projectId, reportDate, progressRate = 5, issueSummaryKo = '특이사항 없음', actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'SAVE_DAILY_SITE_REPORT', payload: { projectId } });
    const siteOperation = requireSiteOperation(projectId);
    const createdAt = nowIso();
    const reportId = `DSR-${projectId}-${reportDate}`;

    db.project.prepare(`
      INSERT OR REPLACE INTO daily_site_reports (
        report_id, site_operation_id, project_id, report_date, process_progress_json,
        labor_json, material_json, issue_summary_ko, photo_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM daily_site_reports WHERE report_id = ?), ?), ?)
    `).run(
      reportId,
      siteOperation.site_operation_id,
      projectId,
      reportDate,
      toJson([{ processId: 'site_progress', progressRate, displayNameKo: '현장 진행률' }]),
      toJson({ status: 'UNKNOWN', notesKo: '투입 인력 상세 입력 예정' }),
      toJson({ status: 'UNKNOWN', notesKo: '자재 사용량 상세 입력 예정' }),
      issueSummaryKo,
      'NEEDS_PHOTO_UPLOAD',
      reportId,
      createdAt,
      createdAt
    );

    db.project.prepare('UPDATE site_operations SET overall_progress_rate = ?, updated_at = ? WHERE site_operation_id = ?')
      .run(progressRate, createdAt, siteOperation.site_operation_id);

    db.project.prepare('UPDATE projects SET progress_rate = ?, updated_at = ? WHERE project_id = ?')
      .run(`${progressRate}%`, createdAt, projectId);

    writeOperationalLog({
      actionType: 'SAVE_DAILY_SITE_REPORT',
      actor,
      projectId,
      messageKo: `공사일보 저장: ${reportDate}`,
      actionKo: '공사일보',
      level: issueSummaryKo === '특이사항 없음' ? 'INFO' : 'WARNING',
      payload: { reportId, progressRate, issueSummaryKo },
      reasonKo: '날짜별 공사일보 저장',
      createdAt
    });

    return { dashboardData: getDashboardData(), reportId };
  }

  function saveMaterialDeliveryCheck({ projectId, materialNameKo, relatedProcessId, deliveryStatus, actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'SAVE_MATERIAL_DELIVERY_CHECK', payload: { projectId } });
    const siteOperation = requireSiteOperation(projectId);
    const createdAt = nowIso();
    const deliveryCheckId = `MDC-${Date.now()}`;
    const warningKo = deliveryStatus === 'DELIVERED' ? '입고 확인 완료' : '자재 미입고: 해당 공정 시작 전 확인 필요';

    db.project.prepare(`
      INSERT INTO material_delivery_checks (
        delivery_check_id, site_operation_id, project_id, material_name_ko,
        related_process_id, delivery_status, quantity_status, warning_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      deliveryCheckId,
      siteOperation.site_operation_id,
      projectId,
      materialNameKo,
      relatedProcessId,
      deliveryStatus,
      'UNKNOWN',
      warningKo,
      createdAt
    );

    if (deliveryStatus !== 'DELIVERED') {
      addSiteRisk({ siteOperation, riskType: 'MATERIAL_NOT_DELIVERED', severity: 'WARNING', descriptionKo: warningKo, createdAt });
      db.project.prepare('UPDATE projects SET risk_score = CASE WHEN risk_score < 72 THEN 72 ELSE risk_score END, risk_level = ?, next_action_ko = ?, updated_at = ? WHERE project_id = ?')
        .run('HIGH', '자재 미입고 공정 시작 경고', createdAt, projectId);
    }

    writeOperationalLog({
      actionType: 'SAVE_MATERIAL_DELIVERY_CHECK',
      actor,
      projectId,
      messageKo: `자재 입고 확인: ${materialNameKo} - ${deliveryStatus}`,
      actionKo: '입고 확인',
      level: deliveryStatus === 'DELIVERED' ? 'INFO' : 'WARNING',
      payload: { deliveryCheckId, materialNameKo, relatedProcessId, deliveryStatus },
      reasonKo: warningKo,
      createdAt
    });

    return { dashboardData: getDashboardData(), deliveryCheckId };
  }

  function saveInspectionResult({ projectId, inspectionType, relatedProcessId, resultStatus, notesKo = '', actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'SAVE_INSPECTION_RESULT', payload: { projectId } });
    const siteOperation = requireSiteOperation(projectId);
    const createdAt = nowIso();
    const inspectionResultId = `INSP-${Date.now()}`;
    const blockedProcesses = resultStatus === 'FAILED' ? nextBlockedProcessesForInspection(inspectionType, relatedProcessId) : [];

    db.project.prepare(`
      INSERT INTO inspection_results (
        inspection_result_id, site_operation_id, project_id, inspection_type,
        related_process_id, result_status, blocked_processes_json, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inspectionResultId,
      siteOperation.site_operation_id,
      projectId,
      inspectionType,
      relatedProcessId,
      resultStatus,
      toJson(blockedProcesses),
      notesKo,
      createdAt
    );

    if (resultStatus === 'FAILED') {
      const currentBlocked = fromJson(siteOperation.blocked_processes_json, []);
      const mergedBlocked = Array.from(new Set([...currentBlocked, ...blockedProcesses]));
      db.project.prepare('UPDATE site_operations SET blocked_processes_json = ?, risk_flags_json = ?, updated_at = ? WHERE site_operation_id = ?')
        .run(toJson(mergedBlocked), toJson(['검수 실패', `${inspectionType} 후속 공정 차단`]), createdAt, siteOperation.site_operation_id);
      addSiteRisk({ siteOperation, riskType: 'INSPECTION_FAILED', severity: 'BLOCKING', descriptionKo: `${inspectionType} 검수 실패`, createdAt });
      db.project.prepare('UPDATE projects SET risk_score = 95, risk_level = ?, defect_risk_ko = ?, next_action_ko = ?, updated_at = ? WHERE project_id = ?')
        .run('BLOCKING', '검수 실패', '검수 실패 후속공정 차단', createdAt, projectId);
    }

    writeOperationalLog({
      actionType: 'SAVE_INSPECTION_RESULT',
      actor,
      projectId,
      messageKo: `검수 ${resultStatus === 'FAILED' ? '실패' : '완료'}: ${inspectionType}`,
      actionKo: '검수',
      level: resultStatus === 'FAILED' ? 'RED' : 'INFO',
      payload: { inspectionResultId, inspectionType, relatedProcessId, resultStatus, blockedProcesses },
      reasonKo: notesKo || '검수 결과 저장',
      createdAt
    });

    return { dashboardData: getDashboardData(), inspectionResultId, blockedProcesses };
  }

  function createSiteIssue({ projectId, issueType, severity, titleKo, descriptionKo, actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_SITE_ISSUE', payload: { projectId } });
    const siteOperation = requireSiteOperation(projectId);
    const createdAt = nowIso();
    const siteIssueId = `SITE-ISSUE-${Date.now()}`;

    db.project.prepare(`
      INSERT INTO site_issues (
        site_issue_id, site_operation_id, project_id, issue_type, severity,
        title_ko, description_ko, risk_dashboard_visible, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      siteIssueId,
      siteOperation.site_operation_id,
      projectId,
      issueType,
      severity,
      titleKo,
      descriptionKo,
      1,
      'OPEN',
      createdAt,
      createdAt
    );

    addSiteRisk({ siteOperation, riskType: issueType, severity, descriptionKo, linkedIssueId: siteIssueId, createdAt });
    db.project.prepare('UPDATE projects SET risk_score = CASE WHEN risk_score < 82 THEN 82 ELSE risk_score END, risk_level = ?, next_action_ko = ?, updated_at = ? WHERE project_id = ?')
      .run(severity === 'BLOCKING' ? 'BLOCKING' : 'HIGH', titleKo, createdAt, projectId);

    writeOperationalLog({
      actionType: 'CREATE_SITE_ISSUE',
      actor,
      projectId,
      messageKo: `현장 이슈 기록: ${titleKo}`,
      actionKo: '이슈',
      level: severity === 'BLOCKING' ? 'RED' : 'WARNING',
      payload: { siteIssueId, issueType, severity },
      reasonKo: descriptionKo,
      createdAt
    });

    return { dashboardData: getDashboardData(), siteIssueId };
  }

  function createChangeOrderRequest({ projectId, titleKo, requestReasonKo, actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_CHANGE_ORDER_REQUEST', payload: { projectId } });
    const siteOperation = requireSiteOperation(projectId);
    const createdAt = nowIso();
    const changeOrderId = `CO-${Date.now()}`;

    db.project.prepare(`
      INSERT INTO change_order_requests (
        change_order_id, site_operation_id, project_id, title_ko,
        request_reason_ko, estimate_reflection_allowed, schedule_reflection_allowed,
        approval_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      changeOrderId,
      siteOperation.site_operation_id,
      projectId,
      titleKo,
      requestReasonKo,
      0,
      0,
      'PENDING_CEO_APPROVAL',
      createdAt,
      createdAt
    );

    db.approval.prepare(`
      INSERT INTO approvals (
        approval_id, project_id, approval_type, title_ko, reason_ko, status,
        rollback_required, rollback_status, blocking_impact_ko, requested_by,
        requested_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `APP-${changeOrderId}`,
      projectId,
      'ChangeOrder',
      `추가공사 승인 요청: ${titleKo}`,
      requestReasonKo,
      'PENDING_CEO_APPROVAL',
      1,
      'READY',
      '승인 전 공정/견적 반영 금지',
      'BOC',
      createdAt,
      createdAt
    );

    writeOperationalLog({
      actionType: 'CREATE_CHANGE_ORDER_REQUEST',
      actor,
      projectId,
      messageKo: `추가공사 승인 요청 생성: ${titleKo}`,
      actionKo: '추가공사',
      level: 'WARNING',
      payload: { changeOrderId, approvalId: `APP-${changeOrderId}` },
      reasonKo: requestReasonKo,
      createdAt
    });

    return { dashboardData: getDashboardData(), changeOrderId };
  }

  function getChangeOrderIdFromApproval(approvalId) {
    if (!approvalId.startsWith('APP-CO-')) return null;
    const withoutPrefix = approvalId.slice(4);
    const revisionMarker = withoutPrefix.indexOf('-REV-');
    return revisionMarker >= 0 ? withoutPrefix.slice(0, revisionMarker) : withoutPrefix;
  }

  function getChangeOrderRequest(changeOrderId) {
    return db.project.prepare('SELECT * FROM change_order_requests WHERE change_order_id = ?').get(changeOrderId);
  }

  function handleChangeOrderApprovalDecision({ approval, decision, actor, reasonKo, createdAt }) {
    const changeOrderId = getChangeOrderIdFromApproval(approval.approval_id);
    if (!changeOrderId) return null;

    const request = getChangeOrderRequest(changeOrderId);
    if (!request) throw new Error(`Change order request not found: ${changeOrderId}`);

    const beforeStatus = request.approval_status;
    let afterStatus = beforeStatus;
    let effectiveDecision = decision;
    let effectiveReasonKo = reasonKo || decisionToKorean(decision);
    const rollbackData = {
      beforeStatus,
      estimateReflectionAllowed: Boolean(request.estimate_reflection_allowed),
      scheduleReflectionAllowed: Boolean(request.schedule_reflection_allowed),
      rollbackAvailable: true
    };

    if (decision === 'APPROVED') {
      afterStatus = 'APPROVED';
      applyApprovedChangeOrder({ request, approvalId: approval.approval_id, actor, createdAt });
    } else if (decision === 'REJECTED') {
      afterStatus = 'REJECTED';
      db.project.prepare(`
        UPDATE change_order_requests
        SET approval_status = ?, estimate_reflection_allowed = 0, schedule_reflection_allowed = 0, updated_at = ?
        WHERE change_order_id = ?
      `).run(afterStatus, createdAt, changeOrderId);
    } else {
      afterStatus = 'REVISION_REQUESTED';
      effectiveDecision = 'REVISION_REQUESTED';
      effectiveReasonKo = reasonKo || '추가공사 수정 요청';
      db.project.prepare(`
        UPDATE change_order_requests
        SET approval_status = ?, estimate_reflection_allowed = 0, schedule_reflection_allowed = 0, updated_at = ?
        WHERE change_order_id = ?
      `).run(afterStatus, createdAt, changeOrderId);

      db.approval.prepare(`
        INSERT INTO approvals (
          approval_id, project_id, approval_type, title_ko, reason_ko, status,
          rollback_required, rollback_status, blocking_impact_ko, requested_by,
          requested_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `APP-${changeOrderId}-REV-${Date.now()}`,
        request.project_id,
        'ChangeOrder',
        `추가공사 수정 재검토: ${request.title_ko}`,
        effectiveReasonKo,
        'PENDING_CEO_APPROVAL',
        1,
        'READY',
        '수정 승인 전 공정/견적 반영 금지',
        'BOC',
        createdAt,
        createdAt
      );
    }

    db.project.prepare(`
      INSERT INTO change_order_approval_logs (
        change_order_approval_log_id, change_order_id, project_id, approval_id,
        action_type, before_status, after_status, customer_approval_required,
        payment_condition_required, rollback_data_json, actor, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `CO-APPLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      changeOrderId,
      request.project_id,
      approval.approval_id,
      effectiveDecision,
      beforeStatus,
      afterStatus,
      1,
      1,
      toJson(rollbackData),
      actor,
      effectiveReasonKo,
      createdAt
    );

    return { effectiveDecision, effectiveReasonKo, changeOrderId, afterStatus };
  }

  function applyApprovedChangeOrder({ request, approvalId, actor, createdAt }) {
    const changeOrderEstimateNo = `CO-EST-${request.change_order_id}`;
    const executionProject = db.project.prepare('SELECT * FROM execution_projects WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(request.project_id);
    if (!executionProject) throw new Error('Change order approval blocked: execution project is required.');

    db.project.prepare(`
      UPDATE change_order_requests
      SET approval_status = 'APPROVED', estimate_reflection_allowed = 1, schedule_reflection_allowed = 1, updated_at = ?
      WHERE change_order_id = ?
    `).run(createdAt, request.change_order_id);

    db.project.prepare(`
      INSERT INTO change_order_cost_impacts (
        cost_impact_id, change_order_id, project_id, change_order_estimate_no,
        amount_status, cost_impact_json, margin_impact_json, approval_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `CO-COST-${request.change_order_id}`,
      request.change_order_id,
      request.project_id,
      changeOrderEstimateNo,
      'UNKNOWN',
      toJson({
        materialCost: 'UNKNOWN',
        laborCost: 'UNKNOWN',
        subcontractCost: 'UNKNOWN',
        notesKo: '추가공사 실제 단가 입력 전까지 UNKNOWN 유지'
      }),
      toJson({
        expectedMargin: 'NEEDS_RESEARCH',
        marginRiskKo: '추가공사비 확정 전 마진 위험'
      }),
      approvalId,
      createdAt
    );

    db.project.prepare(`
      INSERT INTO change_order_schedule_impacts (
        schedule_impact_id, change_order_id, project_id, delay_status,
        delay_days_status, schedule_impact_json, conflict_diagnostics_json,
        approval_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `CO-SCH-${request.change_order_id}`,
      request.change_order_id,
      request.project_id,
      'NEEDS_REVIEW',
      'UNKNOWN',
      toJson({
        addedProcessKo: request.title_ko,
        executionScheduleImpactKo: '기존 공정 사이 추가공정 삽입 필요'
      }),
      toJson({
        materialOrderNeeded: true,
        conflictCheckKo: '기존 공정 충돌 여부 diagnostics 확인 필요',
        blocksAutoReflectionBeforeApproval: false
      }),
      approvalId,
      createdAt
    );

    const milestoneId = `PM-${request.change_order_id}-ADDITIONAL`;
    db.project.prepare(`
      INSERT OR REPLACE INTO payment_milestones (
        milestone_id, execution_project_id, project_id, milestone_type,
        display_name_ko, trigger_condition_ko, amount_status, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      milestoneId,
      executionProject.execution_project_id,
      request.project_id,
      'CHANGE_ORDER_PAYMENT',
      '추가공사비',
      '고객 추가공사 승인 및 입금 확인 후 진행',
      'UNKNOWN',
      toJson({
        changeOrderId: request.change_order_id,
        changeOrderEstimateNo,
        customerApprovalRequired: true,
        paymentRequiredBeforeWork: true
      }),
      createdAt
    );

    db.project.prepare(`
      INSERT INTO change_order_payment_impacts (
        payment_impact_id, change_order_id, project_id, payment_condition_ko,
        amount_status, payment_milestone_id, approval_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `CO-PAY-${request.change_order_id}`,
      request.change_order_id,
      request.project_id,
      '고객 추가공사 승인 + 추가공사비 입금 확인',
      'UNKNOWN',
      milestoneId,
      approvalId,
      createdAt
    );

    db.project.prepare(`
      INSERT OR REPLACE INTO schedule_drafts (
        schedule_item_id, project_id, process_id, process_name_ko, sequence_no,
        start_rule_ko, duration_status, dependencies_json, risk_flags_json,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `SCH-${request.change_order_id}`,
      request.project_id,
      request.change_order_id,
      `추가공사: ${request.title_ko}`,
      900,
      '고객 승인 및 추가공사비 입금 후 시작',
      'UNKNOWN',
      toJson(['IN_PROGRESS 현장 조건', '자재 발주 필요 여부 확인']),
      toJson(['추가공사 일정 지연 가능성', '기존 공정 충돌 diagnostics 필요']),
      'CHANGE_ORDER_APPROVED',
      createdAt
    );

    writeOperationalLog({
      actionType: 'APPLY_APPROVED_CHANGE_ORDER',
      actor,
      projectId: request.project_id,
      messageKo: `추가공사 승인 반영: ${request.title_ko}`,
      actionKo: '추가공사 승인',
      level: 'WARNING',
      payload: { changeOrderId: request.change_order_id, changeOrderEstimateNo, milestoneId },
      reasonKo: '대표 승인 후 비용/일정/수금 영향 반영',
      createdAt
    });
  }

  function getProjectRevenue(projectId) {
    const finalEstimate = db.project.prepare('SELECT final_estimate_json FROM final_estimates WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    const finalPayload = fromJson(finalEstimate?.final_estimate_json, {});
    const directRevenue = Number(finalPayload.customerPrice || finalPayload.finalAmount || finalPayload.totalAmount || 0);
    if (Number.isFinite(directRevenue) && directRevenue > 0) return Math.round(directRevenue);

    if (projectId === 'PRJ-PROD-BATH-0001') return 5490000;

    const estimate = db.project.prepare('SELECT amount_text FROM estimates WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(projectId);
    const amount = Number(String(estimate?.amount_text || '').replace(/[^0-9]/g, ''));
    return Number.isFinite(amount) ? amount : 0;
  }

  const requirementBaselineAmounts = {
    'CCR-PRJ-PROD-BATH-0001-DEMOLITION': 300000,
    'CCR-PRJ-PROD-BATH-0001-WASTE': 150000,
    'CCR-PRJ-PROD-BATH-0001-TILE': 420000,
    'CCR-PRJ-PROD-BATH-0001-TILE-ACCESSORY': 190000,
    'CCR-PRJ-PROD-BATH-0001-LABOR': 750000,
    'CCR-PRJ-PROD-BATH-0001-TRANSPORT': 100000,
    'CCR-PRJ-PROD-BATH-0001-MISC': 60000,
    'CCR-PRJ-PROD-BATH-0001-KNOWN-BASELINE': 2850000
  };

  function getRequirementBaselineAmount(requirement) {
    if (!requirement) return 0;
    if (Object.prototype.hasOwnProperty.call(requirementBaselineAmounts, requirement.requirement_id)) {
      return requirementBaselineAmounts[requirement.requirement_id];
    }

    const payload = fromJson(requirement.payload_json, {});
    const payloadBaseline = toInteger(payload.baselineAmount || payload.baseline_amount || 0);
    if (payloadBaseline > 0) return payloadBaseline;
    return 0;
  }

  function getInitialMarginBasis(projectId, revenue) {
    const finalEstimate = db.project.prepare(`
      SELECT estimated_margin, estimated_margin_rate
      FROM final_estimates
      WHERE project_id = ? AND estimated_margin_rate > 0
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(projectId);
    if (finalEstimate) {
      return {
        initialEstimatedMargin: Number(finalEstimate.estimated_margin || 0),
        initialEstimatedMarginRate: Number(finalEstimate.estimated_margin_rate || 0)
      };
    }

    const estimateDraft = db.project.prepare(`
      SELECT estimated_margin, estimated_margin_rate
      FROM estimate_drafts
      WHERE project_id = ? AND estimated_margin_rate > 0
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(projectId);
    if (estimateDraft) {
      return {
        initialEstimatedMargin: Number(estimateDraft.estimated_margin || 0),
        initialEstimatedMarginRate: Number(estimateDraft.estimated_margin_rate || 0)
      };
    }

    const fallbackRate = 0.25;
    return {
      initialEstimatedMargin: Math.round(Number(revenue || 0) * fallbackRate),
      initialEstimatedMarginRate: fallbackRate
    };
  }

  function recomputeProcessCostLeaks(projectId, createdAt = nowIso()) {
    const rows = db.project.prepare(`
      SELECT requirement.*, COALESCE(SUM(entry.amount), 0) AS actual_amount
      FROM cost_capture_requirements requirement
      LEFT JOIN cost_capture_entries entry ON entry.requirement_id = requirement.requirement_id
      WHERE requirement.project_id = ?
      GROUP BY requirement.requirement_id
    `).all(projectId);

    rows.forEach((row) => {
      const baselineAmount = getRequirementBaselineAmount(row);
      const actualAmount = Number(row.actual_amount || 0);
      const varianceAmount = actualAmount - baselineAmount;
      const varianceRate = baselineAmount > 0 ? Number((varianceAmount / baselineAmount).toFixed(4)) : 0;
      const leakId = `PCL-${projectId}-${row.requirement_id}`;

      if (baselineAmount > 0 && actualAmount > 0 && varianceRate > 0.15) {
        const severity = varianceRate >= 0.3 ? 'RED' : 'YELLOW';
        db.project.prepare(`
          INSERT OR REPLACE INTO process_cost_leaks (
            leak_id, project_id, requirement_id, process_id, cost_category,
            item_name_ko, baseline_amount, actual_amount, variance_amount,
            variance_rate, severity, alert_message_ko, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            COALESCE((SELECT created_at FROM process_cost_leaks WHERE leak_id = ?), ?),
            ?
          )
        `).run(
          leakId,
          projectId,
          row.requirement_id,
          row.process_id,
          row.cost_category,
          row.item_name_ko,
          baselineAmount,
          actualAmount,
          varianceAmount,
          varianceRate,
          severity,
          `${row.item_name_ko} 실제 원가가 baseline 대비 ${(varianceRate * 100).toFixed(1)}% 초과했습니다.`,
          leakId,
          createdAt,
          createdAt
        );
      } else {
        db.project.prepare('DELETE FROM process_cost_leaks WHERE leak_id = ?').run(leakId);
      }
    });
    syncCostLeakRootCauses(projectId, createdAt);
  }

  const rootCauseLabelsKo = {
    estimate_missing: '견적 누락',
    unit_price_underestimated: '단가 과소 산정',
    quantity_underestimated: '수량 과소 산정',
    labor_underestimated: '품수 과소 산정',
    waste_transport_missing: '폐기물/운반비 누락',
    option_inclusion_error: '옵션 포함가 오류',
    site_condition_change: '현장 변수 발생',
    vendor_price_gap: '거래처 단가 차이',
    defect_rework: '시공 하자/재작업',
    accessory_underestimated: '부자재 과소 산정'
  };

  function classifyCostLeakRootCause(leak) {
    const category = String(leak.cost_category || '');
    const itemNameKo = String(leak.item_name_ko || '');
    if (leak.project_id === 'PRJ-PROD-BATH-0001') {
      if (category === 'demolition') {
        return {
          rootCauseType: 'estimate_missing',
          rootCauseNameKo: '견적 누락',
          reasonKo: '철거 실제 원가가 별도 항목으로 충분히 방어되지 않았습니다. 단가 과소 산정 가능성도 함께 검토합니다.'
        };
      }
      if (category === 'waste') {
        return {
          rootCauseType: 'estimate_missing',
          rootCauseNameKo: '견적 누락',
          reasonKo: '폐기물 반출비가 기본 견적 방어 항목으로 충분히 분리되지 않았습니다.'
        };
      }
      if (category === 'tileAccessory') {
        return {
          rootCauseType: 'accessory_underestimated',
          rootCauseNameKo: '부자재 과소 산정',
          reasonKo: '타일 부자재 baseline보다 실제 부자재 사용 금액이 초과되었습니다.'
        };
      }
      if (category === 'transport') {
        return {
          rootCauseType: 'estimate_missing',
          rootCauseNameKo: '견적 누락',
          reasonKo: '운반비가 고객가 또는 내부 원가표에서 별도 견적 항목으로 충분히 방어되지 않았습니다.'
        };
      }
      if (category === 'miscellaneous') {
        return {
          rootCauseType: 'estimate_missing',
          rootCauseNameKo: '견적 누락',
          reasonKo: '기타 잡비가 기본 패키지 원가 방어 항목으로 별도 관리되지 않았습니다.'
        };
      }
    }

    if (category.includes('labor')) {
      return { rootCauseType: 'labor_underestimated', rootCauseNameKo: rootCauseLabelsKo.labor_underestimated, reasonKo: `${itemNameKo} 품수 baseline이 실제 투입보다 낮습니다.` };
    }
    if (category.includes('waste') || category.includes('transport')) {
      return { rootCauseType: 'waste_transport_missing', rootCauseNameKo: rootCauseLabelsKo.waste_transport_missing, reasonKo: `${itemNameKo} 폐기/운반 비용 방어가 부족합니다.` };
    }
    if (category.includes('Accessory') || category.includes('accessory')) {
      return { rootCauseType: 'accessory_underestimated', rootCauseNameKo: rootCauseLabelsKo.accessory_underestimated, reasonKo: `${itemNameKo} 부자재 기준량 또는 기준 단가가 낮습니다.` };
    }
    if (Number(leak.variance_rate || 0) > 0.15) {
      return { rootCauseType: 'unit_price_underestimated', rootCauseNameKo: rootCauseLabelsKo.unit_price_underestimated, reasonKo: `${itemNameKo} 실제 원가가 baseline 대비 15%를 초과했습니다.` };
    }
    return { rootCauseType: 'site_condition_change', rootCauseNameKo: rootCauseLabelsKo.site_condition_change, reasonKo: `${itemNameKo} 현장 변수에 따른 원가 초과 후보입니다.` };
  }

  function syncCostLeakRootCauses(projectId = null, createdAt = nowIso()) {
    const leaks = db.project.prepare(`
      SELECT *
      FROM process_cost_leaks
      WHERE (? IS NULL OR project_id = ?)
      ORDER BY updated_at DESC
    `).all(projectId, projectId);

    leaks.forEach((leak) => {
      const rootCause = classifyCostLeakRootCause(leak);
      const rootCauseId = `RCA-${leak.leak_id}`;
      db.project.prepare(`
        INSERT OR REPLACE INTO cost_leak_root_causes (
          root_cause_id, leak_id, project_id, requirement_id, process_id,
          cost_category, item_name_ko, root_cause_type, root_cause_name_ko,
          reason_ko, status, approval_required, case_library_link_json,
          evidence_json, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          COALESCE((SELECT created_at FROM cost_leak_root_causes WHERE root_cause_id = ?), ?),
          ?
        )
      `).run(
        rootCauseId,
        leak.leak_id,
        leak.project_id,
        leak.requirement_id,
        leak.process_id,
        leak.cost_category,
        leak.item_name_ko,
        rootCause.rootCauseType,
        rootCause.rootCauseNameKo,
        rootCause.reasonKo,
        'CANDIDATE',
        1,
        toJson({ projectId: leak.project_id, caseLinkStatus: 'READY_FOR_CASE_LIBRARY' }),
        toJson({
          baselineAmount: leak.baseline_amount,
          actualAmount: leak.actual_amount,
          varianceAmount: leak.variance_amount,
          varianceRate: leak.variance_rate,
          severity: leak.severity
        }),
        rootCauseId,
        createdAt,
        createdAt
      );
      db.project.prepare(`
        UPDATE cost_leak_root_causes
        SET estimate_id = COALESCE(estimate_id, (SELECT estimate_draft_id FROM estimate_drafts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1)),
            financial_impact = ?,
            recommended_prevention = ?
        WHERE root_cause_id = ?
      `).run(
        leak.project_id,
        Math.max(0, Number(leak.variance_amount || 0)),
        rootCause.reasonKo,
        rootCauseId
      );
      logProfitAutomationEvent({
        sourceModule: 'RootCauseLearning',
        triggerEvent: 'PROCESS_COST_LEAK',
        entityType: 'Project',
        entityId: leak.project_id,
        decision: mapLegacyRootCauseToAutomation(rootCause.rootCauseType),
        reason: rootCause.reasonKo,
        beforeState: toJson({ baselineAmount: leak.baseline_amount, actualAmount: leak.actual_amount }),
        afterState: rootCauseId,
        createdAt
      });
    });

    syncRootCausePatterns(createdAt);
  }

  function syncRootCausePatterns(createdAt = nowIso()) {
    const groups = db.project.prepare(`
      SELECT root_cause_type, root_cause_name_ko, COUNT(*) AS occurrence_count
      FROM cost_leak_root_causes
      GROUP BY root_cause_type, root_cause_name_ko
    `).all();
    const activeTypes = new Set(groups.map((group) => group.root_cause_type));

    db.project.prepare('SELECT root_cause_type FROM root_cause_patterns').all().forEach((row) => {
      if (!activeTypes.has(row.root_cause_type)) {
        db.project.prepare('DELETE FROM root_cause_patterns WHERE root_cause_type = ?').run(row.root_cause_type);
        db.project.prepare('DELETE FROM root_cause_learning_suggestions WHERE root_cause_type = ?').run(row.root_cause_type);
      }
    });

    groups.forEach((group) => {
      const causes = db.project.prepare(`
        SELECT *
        FROM cost_leak_root_causes
        WHERE root_cause_type = ?
        ORDER BY updated_at DESC
      `).all(group.root_cause_type);
      const patternId = `RCP-${group.root_cause_type}`;
      const occurrenceCount = Number(group.occurrence_count || 0);
      const severity = occurrenceCount >= 3 ? 'HIGH' : occurrenceCount >= 2 ? 'MEDIUM' : 'LOW';
      db.project.prepare(`
        INSERT OR REPLACE INTO root_cause_patterns (
          pattern_id, root_cause_type, root_cause_name_ko, occurrence_count,
          affected_projects_json, affected_items_json, severity, detection_rule_ko,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM root_cause_patterns WHERE pattern_id = ?), ?), ?)
      `).run(
        patternId,
        group.root_cause_type,
        group.root_cause_name_ko,
        occurrenceCount,
        toJson([...new Set(causes.map((cause) => cause.project_id))]),
        toJson(causes.map((cause) => ({ itemNameKo: cause.item_name_ko, requirementId: cause.requirement_id, projectId: cause.project_id }))),
        severity,
        '동일 rootCauseType 2건 이상이면 Learning Suggestion 후보 생성',
        patternId,
        createdAt,
        createdAt
      );

      if (occurrenceCount >= 2) {
        createRootCauseLearningSuggestion({ patternId, group, causes, createdAt });
      }
    });
  }

  function createRootCauseLearningSuggestion({ patternId, group, causes, createdAt }) {
    const suggestionId = `RCLS-${group.root_cause_type}`;
    const linkedLearningSuggestionId = `SUG-${patternId}`;
    const titleKo = `${group.root_cause_name_ko} 반복 원인 보정`;
    const suggestionKo = `${group.root_cause_name_ko} 원인이 ${causes.length}건 반복되었습니다. 다음 견적부터 해당 항목을 기본 원가 방어 또는 NEEDS_CONFIRMATION 경고로 올려야 합니다.`;
    const evidence = {
      rootCauseType: group.root_cause_type,
      occurrenceCount: causes.length,
      affectedProjects: [...new Set(causes.map((cause) => cause.project_id))],
      affectedItems: causes.map((cause) => cause.item_name_ko)
    };

    db.project.prepare(`
      INSERT OR REPLACE INTO root_cause_learning_suggestions (
        suggestion_id, pattern_id, root_cause_type, title_ko, suggestion_ko,
        status, approval_required, linked_learning_suggestion_id, evidence_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM root_cause_learning_suggestions WHERE suggestion_id = ?), ?), ?)
    `).run(
      suggestionId,
      patternId,
      group.root_cause_type,
      titleKo,
      suggestionKo,
      'PENDING_CEO_APPROVAL',
      1,
      linkedLearningSuggestionId,
      toJson(evidence),
      suggestionId,
      createdAt,
      createdAt
    );

    upsertLearningSuggestion({
      patternId,
      suggestionType: 'ROOT_CAUSE_CORRECTION',
      titleKo,
      suggestionKo,
      evidence,
      targetDb: 'process_db',
      targetItemId: group.root_cause_type,
      createdAt
    });
  }

  const preventionRuleMap = {
    estimate_missing: [
      { itemId: 'demolition_cost', itemNameKo: '철거비', mappedAction: 'MANDATORY_INCLUDE' },
      { itemId: 'waste_disposal_cost', itemNameKo: '폐기물 반출비', mappedAction: 'MANDATORY_INCLUDE' },
      { itemId: 'transport_cost', itemNameKo: '운반비', mappedAction: 'MANDATORY_INCLUDE' },
      { itemId: 'misc_contingency_cost', itemNameKo: '기타 잡비 / contingency', mappedAction: 'MANDATORY_INCLUDE' }
    ],
    unit_price_underestimated: [
      { itemId: 'minimum_unit_price_guard', itemNameKo: '최소 단가 방어선', mappedAction: 'MIN_PRICE_GUARD' }
    ],
    quantity_underestimated: [
      { itemId: 'quantity_adjustment_guard', itemNameKo: '자동 수량 보정', mappedAction: 'QTY_ADJUSTMENT' }
    ],
    labor_underestimated: [
      { itemId: 'minimum_labor_charge', itemNameKo: '최소 품수 기준', mappedAction: 'MIN_LABOR_GUARD' }
    ],
    accessory_underestimated: [
      { itemId: 'tile_accessory_package', itemNameKo: '타일 부자재 패키지', mappedAction: 'MANDATORY_INCLUDE' }
    ],
    waste_transport_missing: [
      { itemId: 'waste_disposal_cost', itemNameKo: '폐기물 반출비', mappedAction: 'MANDATORY_INCLUDE' },
      { itemId: 'transport_cost', itemNameKo: '운반비', mappedAction: 'MANDATORY_INCLUDE' }
    ],
    option_inclusion_error: [
      { itemId: 'upsell_option_separation', itemNameKo: '옵션 포함가 분리', mappedAction: 'OPTION_SEPARATION' }
    ],
    site_condition_change: [
      { itemId: 'site_condition_confirmation', itemNameKo: '현장 변수 확인', mappedAction: 'NEEDS_CONFIRMATION' }
    ],
    vendor_price_gap: [
      { itemId: 'vendor_price_verification', itemNameKo: '거래처 단가 검증', mappedAction: 'VENDOR_PRICE_CHECK' }
    ],
    defect_rework: [
      { itemId: 'rework_risk_buffer', itemNameKo: '재작업 리스크 버퍼', mappedAction: 'REWORK_BUFFER' }
    ]
  };

  const bathroomBaselinePreventionItems = [
    {
      ruleId: 'PREV-PRJ-PROD-BATH-0001-demolition_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'demolition_cost',
      itemNameKo: '철거비',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: 'PRJ-PROD-BATH-0001에서 철거비 누락이 실제 마진 저하 원인으로 확인되어 다음 욕실 견적부터 필수 포함합니다.'
    },
    {
      ruleId: 'PREV-PRJ-PROD-BATH-0001-waste_disposal_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'waste_disposal_cost',
      itemNameKo: '폐기물 반출비',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: 'PRJ-PROD-BATH-0001에서 폐기물 반출비 누락이 실제 마진 저하 원인으로 확인되어 다음 욕실 견적부터 필수 포함합니다.'
    },
    {
      ruleId: 'PREV-PRJ-PROD-BATH-0001-transport_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'transport_cost',
      itemNameKo: '운반비',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: 'PRJ-PROD-BATH-0001에서 운반비 누락이 실제 마진 저하 원인으로 확인되어 다음 욕실 견적부터 필수 포함합니다.'
    },
    {
      ruleId: 'PREV-PRJ-PROD-BATH-0001-misc_contingency_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'misc_contingency_cost',
      itemNameKo: '기타 잡비 / contingency',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: 'PRJ-PROD-BATH-0001에서 기타 잡비 누락이 실제 마진 저하 원인으로 확인되어 다음 욕실 견적부터 contingency를 필수 포함합니다.'
    },
    {
      ruleId: 'PREV-PRJ-PROD-BATH-0001-tile_accessory_package',
      rootCauseType: 'accessory_underestimated',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'tile_accessory_package',
      itemNameKo: '타일 부자재 패키지',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: 'PRJ-PROD-BATH-0001에서 타일 부자재 과소 산정이 확인되어 다음 욕실 견적부터 필수 포함합니다.'
    }
  ];

  const kitchenBaselinePreventionItems = [
    {
      ruleId: 'PREV-KITCHEN-V1-demolition_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'kitchen_demolition_cost',
      itemNameKo: '주방 철거비',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: '주방 리모델링은 싱크대, 상판, 벽타일 철거 범위가 원가 누수로 이어지므로 필수 포함합니다.'
    },
    {
      ruleId: 'PREV-KITCHEN-V1-waste_disposal_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'kitchen_waste_disposal_cost',
      itemNameKo: '주방 폐기물 반출비',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: '기존 싱크대, 상판, 타일 폐기물이 누락되지 않도록 필수 포함합니다.'
    },
    {
      ruleId: 'PREV-KITCHEN-V1-transport_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'kitchen_transport_cost',
      itemNameKo: '주방 운반비',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: '싱크대, 상판, 후드, 타일 자재 운반비를 기본 방어 항목으로 포함합니다.'
    },
    {
      ruleId: 'PREV-KITCHEN-V1-sink_cabinet_package',
      rootCauseType: 'option_inclusion_error',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'kitchen_sink_cabinet_package',
      itemNameKo: '싱크대 본체 패키지',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: '하부장, 상부장, 기본 하드웨어가 견적에서 빠지지 않도록 필수 포함합니다.'
    },
    {
      ruleId: 'PREV-KITCHEN-V1-countertop_package',
      rootCauseType: 'unit_price_underestimated',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'kitchen_countertop_package',
      itemNameKo: '상판 패키지',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: '상판 종류와 길이에 따라 원가 차이가 커서 필수 원가 항목으로 관리합니다.'
    },
    {
      ruleId: 'PREV-KITCHEN-V1-tile_accessory_package',
      rootCauseType: 'accessory_underestimated',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'kitchen_tile_accessory_package',
      itemNameKo: '주방 벽타일 및 부자재',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: '주방 벽타일, 접착재, 줄눈, 실리콘 부자재 누락을 방지합니다.'
    },
    {
      ruleId: 'PREV-KITCHEN-V1-misc_contingency_cost',
      rootCauseType: 'estimate_missing',
      mappedAction: 'MANDATORY_INCLUDE',
      itemId: 'kitchen_misc_contingency_cost',
      itemNameKo: '주방 기타 잡비 / contingency',
      enforcementLevel: 'MANDATORY',
      occurrenceCount: 2,
      reasonKo: '치수 오차, 현장 보완, 소모품 비용을 원가 방어선에 포함합니다.'
    }
  ];

  function syncPreventionRulesFromRootCauses(createdAt = nowIso()) {
    syncCostLeakRootCauses(null, createdAt);
    const patterns = db.project.prepare('SELECT * FROM root_cause_patterns ORDER BY occurrence_count DESC').all();
    const activeRuleIds = new Set();

    patterns.forEach((pattern) => {
      const occurrenceCount = Number(pattern.occurrence_count || 0);
      const mappedItems = preventionRuleMap[pattern.root_cause_type] || [];
      const canApply = occurrenceCount >= 2 || pattern.root_cause_type === 'accessory_underestimated';
      if (!canApply) return;

      mappedItems.forEach((item) => {
        const enforcementLevel = occurrenceCount >= 3 ? 'AUTO_LOCKED' : 'MANDATORY';
        const ruleId = `PREV-${pattern.root_cause_type}-${item.itemId}`;
        activeRuleIds.add(ruleId);
        db.project.prepare(`
          INSERT OR REPLACE INTO prevention_rules (
            rule_id, source_pattern_id, root_cause_type, mapped_action,
            project_type, item_id, item_name_ko, enforcement_level,
            display_severity, occurrence_count, approval_required_on_remove,
            status, reason_ko, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM prevention_rules WHERE rule_id = ?), ?), ?)
        `).run(
          ruleId,
          pattern.pattern_id,
          pattern.root_cause_type,
          item.mappedAction,
          'bathroom_remodeling',
          item.itemId,
          item.itemNameKo,
          enforcementLevel,
          enforcementLevel === 'AUTO_LOCKED' ? 'RED_LOCK' : 'ORANGE',
          occurrenceCount,
          1,
          'ACTIVE',
          `${pattern.root_cause_name_ko} 원인이 ${occurrenceCount}건 반복되어 다음 견적에 ${item.itemNameKo} 항목을 자동 방어합니다.`,
          ruleId,
          createdAt,
          createdAt
        );
      });
    });

    bathroomBaselinePreventionItems.forEach((item) => {
      activeRuleIds.add(item.ruleId);
      db.project.prepare(`
        INSERT OR REPLACE INTO prevention_rules (
          rule_id, source_pattern_id, root_cause_type, mapped_action,
          project_type, item_id, item_name_ko, enforcement_level,
          display_severity, occurrence_count, approval_required_on_remove,
          status, reason_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM prevention_rules WHERE rule_id = ?), ?), ?)
      `).run(
        item.ruleId,
        'PAT-PRJ-PROD-BATH-0001-BASELINE',
        item.rootCauseType,
        item.mappedAction,
        'bathroom_remodeling',
        item.itemId,
        item.itemNameKo,
        item.enforcementLevel,
        'RED_LOCK',
        item.occurrenceCount,
        1,
        'ACTIVE',
        item.reasonKo,
        item.ruleId,
        createdAt,
        createdAt
      );
    });

    kitchenBaselinePreventionItems.forEach((item) => {
      activeRuleIds.add(item.ruleId);
      db.project.prepare(`
        INSERT OR REPLACE INTO prevention_rules (
          rule_id, source_pattern_id, root_cause_type, mapped_action,
          project_type, item_id, item_name_ko, enforcement_level,
          display_severity, occurrence_count, approval_required_on_remove,
          status, reason_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM prevention_rules WHERE rule_id = ?), ?), ?)
      `).run(
        item.ruleId,
        'PAT-KITCHEN-REMODELING-STANDARD-V1',
        item.rootCauseType,
        item.mappedAction,
        'kitchen_remodeling',
        item.itemId,
        item.itemNameKo,
        item.enforcementLevel,
        'RED_LOCK',
        item.occurrenceCount,
        1,
        'ACTIVE',
        item.reasonKo,
        item.ruleId,
        createdAt,
        createdAt
      );
    });

    db.project.prepare("UPDATE prevention_rules SET status = 'INACTIVE', updated_at = ? WHERE rule_id NOT IN (SELECT rule_id FROM prevention_rules WHERE status = 'ACTIVE')").run(createdAt);
    return db.project.prepare("SELECT * FROM prevention_rules WHERE status = 'ACTIVE' ORDER BY display_severity DESC, item_name_ko").all();
  }

  function getPreventionRulesForMinimumInput(minimumInput = {}) {
    const targetProjectType = resolveProjectTypeFromMinimumInput(minimumInput);
    syncPreventionRulesFromRootCauses(nowIso());
    const configMandatoryItems = db.master.prepare(`
      SELECT *
      FROM project_type_mandatory_items
      WHERE item_status = 'ACTIVE' AND project_type = ?
      ORDER BY enforcement_level DESC, item_name_ko
    `).all(targetProjectType).map((item) => ({
      rule_id: `CONFIG-${item.mandatory_item_id}`,
      source_pattern_id: 'PROJECT_TYPE_CONFIG',
      root_cause_type: 'project_type_standard',
      mapped_action: 'MANDATORY_INCLUDE',
      project_type: item.project_type,
      item_id: item.item_id,
      item_name_ko: item.item_name_ko,
      enforcement_level: item.enforcement_level,
      display_severity: item.enforcement_level === 'AUTO_LOCKED' ? 'RED_LOCK' : 'ORANGE',
      occurrence_count: 2,
      approval_required_on_remove: item.approval_required_on_remove,
      status: 'ACTIVE',
      reason_ko: item.reason_ko
    }));
    const learnedRules = db.project.prepare(`
      SELECT *
      FROM prevention_rules
      WHERE status = 'ACTIVE' AND project_type = ?
      ORDER BY display_severity DESC, item_name_ko
    `).all(targetProjectType);
    const seen = new Set();
    return [...configMandatoryItems, ...learnedRules].filter((item) => {
      if (seen.has(item.item_id)) return false;
      seen.add(item.item_id);
      return true;
    });
  }

  function syncEstimateMandatoryItems({ estimateDraftId, projectId, minimumInput, createdAt = nowIso() }) {
    const rules = getPreventionRulesForMinimumInput(minimumInput);
    db.project.prepare('DELETE FROM estimate_mandatory_items WHERE estimate_draft_id = ?').run(estimateDraftId);

    const insert = db.project.prepare(`
      INSERT INTO estimate_mandatory_items (
        mandatory_item_id, estimate_draft_id, project_id, rule_id, item_id,
        item_name_ko, enforcement_level, status, reason_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    rules.forEach((rule) => {
      insert.run(
        `EMI-${estimateDraftId}-${rule.item_id}`,
        estimateDraftId,
        projectId,
        rule.rule_id,
        rule.item_id,
        rule.item_name_ko,
        rule.enforcement_level,
        'INCLUDED',
        rule.reason_ko,
        createdAt,
        createdAt
      );
    });
    return rules;
  }

  function getEstimateMandatoryItems(estimateDraftId) {
    return db.project.prepare(`
      SELECT *
      FROM estimate_mandatory_items
      WHERE estimate_draft_id = ?
      ORDER BY enforcement_level DESC, item_name_ko
    `).all(estimateDraftId).map((row) => ({
      mandatoryItemId: row.mandatory_item_id,
      ruleId: row.rule_id,
      itemId: row.item_id,
      itemNameKo: row.item_name_ko,
      enforcementLevel: row.enforcement_level,
      status: row.status,
      reasonKo: row.reason_ko
    }));
  }

  function buildLiveMarginSnapshot(projectId, revenue, capturedCost, createdAt = nowIso()) {
    const requirements = db.project.prepare('SELECT * FROM cost_capture_requirements WHERE project_id = ?').all(projectId);
    const estimatedRemainingCost = requirements.reduce((total, requirement) => {
      if (requirement.status === 'CAPTURED' || requirement.status === 'WAIVED_BY_APPROVAL') return total;
      return total + getRequirementBaselineAmount(requirement);
    }, 0);
    const marginBasis = getInitialMarginBasis(projectId, revenue);
    const currentForecastMargin = revenue - capturedCost - estimatedRemainingCost;
    const currentForecastMarginRate = revenue > 0 ? Number((currentForecastMargin / revenue).toFixed(4)) : 0;
    const marginDropRate = Number((marginBasis.initialEstimatedMarginRate - currentForecastMarginRate).toFixed(4));
    const leakCount = Number(db.project.prepare('SELECT COUNT(*) AS count FROM process_cost_leaks WHERE project_id = ?').get(projectId).count || 0);
    const redLeakCount = Number(db.project.prepare("SELECT COUNT(*) AS count FROM process_cost_leaks WHERE project_id = ? AND severity = 'RED'").get(projectId).count || 0);
    const marginStatus = currentForecastMarginRate < 0.2 || marginDropRate >= 0.1 || redLeakCount > 0
      ? 'RED_ALERT'
      : marginDropRate >= 0.05 || leakCount > 0
        ? 'WARNING'
        : 'STABLE';
    const alertLevel = marginStatus === 'RED_ALERT' ? 'RED' : marginStatus === 'WARNING' ? 'YELLOW' : 'GREEN';

    return {
      projectId,
      revenue,
      capturedCost,
      estimatedRemainingCost,
      initialEstimatedMargin: marginBasis.initialEstimatedMargin,
      initialEstimatedMarginRate: marginBasis.initialEstimatedMarginRate,
      currentForecastMargin,
      currentForecastMarginRate,
      marginDropRate,
      marginStatus,
      alertLevel,
      createdAt
    };
  }

  function insertLiveMarginSnapshot(snapshot) {
    const snapshotId = `LMS-${snapshot.projectId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.project.prepare(`
      INSERT INTO live_margin_snapshots (
        snapshot_id, project_id, revenue, captured_cost, estimated_remaining_cost,
        initial_estimated_margin, initial_estimated_margin_rate,
        current_forecast_margin, current_forecast_margin_rate, margin_drop_rate,
        margin_status, alert_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshotId,
      snapshot.projectId,
      snapshot.revenue,
      snapshot.capturedCost,
      snapshot.estimatedRemainingCost,
      snapshot.initialEstimatedMargin,
      snapshot.initialEstimatedMarginRate,
      snapshot.currentForecastMargin,
      snapshot.currentForecastMarginRate,
      snapshot.marginDropRate,
      snapshot.marginStatus,
      snapshot.alertLevel,
      snapshot.createdAt
    );
    return snapshotId;
  }

  function recordLiveMarginEvent(snapshot, createdAt = nowIso()) {
    if (!snapshot || snapshot.currentForecastMarginRate >= PROFIT_POLICY.blockMarginRate) return null;
    const decision = snapshot.currentForecastMarginRate < 0.2 ? 'RED_ALERT' : 'PROFIT_ALERT';
    const id = `LME-${snapshot.projectId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const estimate = db.project.prepare('SELECT estimate_draft_id FROM estimate_drafts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(snapshot.projectId);
    db.project.prepare(`
      INSERT INTO live_margin_events (
        id, project_id, estimate_id, current_margin_rate, threshold,
        decision, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      snapshot.projectId,
      estimate?.estimate_draft_id || null,
      snapshot.currentForecastMarginRate,
      decision === 'RED_ALERT' ? 0.2 : PROFIT_POLICY.blockMarginRate,
      decision,
      `Live margin ${(snapshot.currentForecastMarginRate * 100).toFixed(2)}% below threshold.`,
      createdAt
    );
    logProfitAutomationEvent({
      sourceModule: 'LiveMarginTracking',
      triggerEvent: 'MARGIN_THRESHOLD_CROSSED',
      entityType: 'Project',
      entityId: snapshot.projectId,
      decision,
      reason: `current_margin=${snapshot.currentForecastMarginRate}`,
      beforeState: toJson({ initialMarginRate: snapshot.initialEstimatedMarginRate }),
      afterState: toJson({ currentMarginRate: snapshot.currentForecastMarginRate, marginDropRate: snapshot.marginDropRate }),
      createdAt
    });
    if (decision === 'RED_ALERT' || decision === 'PROFIT_ALERT') {
      createAutomationRootCause({
        projectId: snapshot.projectId,
        estimateId: estimate?.estimate_draft_id || null,
        rootCause: snapshot.marginDropRate >= 0.05 ? 'LABOR_OVERRUN' : 'UNKNOWN',
        financialImpact: Math.abs(snapshot.currentForecastMargin),
        recommendedPrevention: decision === 'RED_ALERT' ? '관리자 검토 전 Completion 승인을 차단합니다.' : '원가 누수 원인을 확인하고 risk buffer를 조정합니다.',
        createdAt
      });
    }
    return { id, decision };
  }

  function getLatestLiveMarginSnapshot(projectId) {
    const row = db.project.prepare(`
      SELECT *
      FROM live_margin_snapshots
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId);
    if (!row) return null;
    return {
      snapshotId: row.snapshot_id,
      projectId: row.project_id,
      revenue: row.revenue,
      capturedCost: row.captured_cost,
      estimatedRemainingCost: row.estimated_remaining_cost,
      initialEstimatedMargin: row.initial_estimated_margin,
      initialEstimatedMarginRate: row.initial_estimated_margin_rate,
      currentForecastMargin: row.current_forecast_margin,
      currentForecastMarginRate: row.current_forecast_margin_rate,
      marginDropRate: row.margin_drop_rate,
      marginStatus: row.margin_status,
      alertLevel: row.alert_level,
      createdAt: row.created_at
    };
  }

  function recomputeCostCaptureStatus(projectId, { recordSnapshot = false } = {}) {
    const revenue = getProjectRevenue(projectId);
    const capturedCost = Number(db.project.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM cost_capture_entries
      WHERE project_id = ?
    `).get(projectId).total || 0);
    const missingCriticalCount = Number(db.project.prepare(`
      SELECT COUNT(*) AS count
      FROM cost_capture_requirements
      WHERE project_id = ?
        AND blocking_level = 'RED'
        AND status IN ('MISSING_CRITICAL', 'NEEDS_RESEARCH')
    `).get(projectId).count || 0);
    const updatedAt = nowIso();
    recomputeProcessCostLeaks(projectId, updatedAt);
    const liveMargin = buildLiveMarginSnapshot(projectId, revenue, capturedCost, updatedAt);
    if (recordSnapshot) {
      insertLiveMarginSnapshot(liveMargin);
      recordLiveMarginEvent(liveMargin, updatedAt);
    }
    const forecastMargin = liveMargin.currentForecastMargin;
    const forecastMarginRate = liveMargin.currentForecastMarginRate;
    const completionBlocked = missingCriticalCount > 0 || liveMargin.alertLevel === 'RED' ? 1 : 0;
    const redAlertCount = missingCriticalCount + (liveMargin.alertLevel === 'RED' ? 1 : 0);
    const ceoAlertCount = liveMargin.alertLevel === 'YELLOW' ? 1 : 0;

    db.project.prepare(`
      INSERT INTO cost_capture_status (
        project_id, revenue, captured_cost, missing_critical_count,
        forecast_margin, forecast_margin_rate, completion_blocked,
        red_alert_count, ceo_alert_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        revenue = excluded.revenue,
        captured_cost = excluded.captured_cost,
        missing_critical_count = excluded.missing_critical_count,
        forecast_margin = excluded.forecast_margin,
        forecast_margin_rate = excluded.forecast_margin_rate,
        completion_blocked = excluded.completion_blocked,
        red_alert_count = excluded.red_alert_count,
        ceo_alert_count = excluded.ceo_alert_count,
        updated_at = excluded.updated_at
    `).run(projectId, revenue, capturedCost, missingCriticalCount, forecastMargin, forecastMarginRate, completionBlocked, redAlertCount, ceoAlertCount, updatedAt);

    return {
      projectId,
      revenue,
      capturedCost,
      missingCriticalCount,
      forecastMargin,
      forecastMarginRate,
      completionBlocked: Boolean(completionBlocked),
      redAlertCount,
      ceoAlertCount,
      liveMargin,
      updatedAt
    };
  }

  function getActualCostCaptureDashboard() {
    const requirements = db.project.prepare(`
      SELECT *
      FROM cost_capture_requirements
      ORDER BY project_id, blocking_level DESC, item_name_ko
    `).all();
    const projectIds = [...new Set(requirements.map((row) => row.project_id))];
    projectIds.forEach(recomputeCostCaptureStatus);

    const statuses = db.project.prepare('SELECT * FROM cost_capture_status ORDER BY updated_at DESC').all();
    const entries = db.project.prepare('SELECT * FROM cost_capture_entries ORDER BY captured_at DESC LIMIT 50').all();
    const leaks = db.project.prepare('SELECT * FROM cost_leak_analysis ORDER BY created_at DESC LIMIT 30').all();
    const processCostLeaks = db.project.prepare('SELECT * FROM process_cost_leaks ORDER BY updated_at DESC LIMIT 50').all();
    const rootCauses = db.project.prepare('SELECT * FROM cost_leak_root_causes ORDER BY updated_at DESC LIMIT 50').all();
    const rootCausePatterns = db.project.prepare('SELECT * FROM root_cause_patterns ORDER BY occurrence_count DESC, updated_at DESC LIMIT 30').all();
    const rootCauseSuggestions = db.project.prepare('SELECT * FROM root_cause_learning_suggestions ORDER BY updated_at DESC LIMIT 30').all();

    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      topKpis: statuses.map((row) => {
        const liveMargin = getLatestLiveMarginSnapshot(row.project_id) || buildLiveMarginSnapshot(row.project_id, row.revenue, row.captured_cost, row.updated_at);
        return {
          projectId: row.project_id,
          revenue: row.revenue,
          capturedCost: row.captured_cost,
          missingCriticalCount: row.missing_critical_count,
          forecastMargin: row.forecast_margin,
          forecastMarginRate: row.forecast_margin_rate,
          completionBlocked: Boolean(row.completion_blocked),
          redAlertCount: row.red_alert_count,
          ceoAlertCount: row.ceo_alert_count,
          liveMargin
        };
      }),
      requirements: requirements.map((row) => ({
        requirementId: row.requirement_id,
        projectId: row.project_id,
        processId: row.process_id,
        costCategory: row.cost_category,
        itemNameKo: row.item_name_ko,
        requiredStage: row.required_stage,
        blockingLevel: row.blocking_level,
        sourceType: row.source_type,
        vendorRequired: Boolean(row.vendor_required),
        amountRequired: Boolean(row.amount_required),
        status: row.status,
        updatedAt: row.updated_at
      })),
      entries: entries.map((row) => ({
        entryId: row.entry_id,
        requirementId: row.requirement_id,
        projectId: row.project_id,
        amount: row.amount,
        quantity: row.quantity,
        unit: row.unit,
        vendorId: row.vendor_id,
        vendorNameKo: row.vendor_name_ko,
        sourceDocumentKo: row.source_document_ko,
        capturedBy: row.captured_by,
        capturedAt: row.captured_at,
        payload: fromJson(row.payload_json, {})
      })),
      costLeakAnalysis: leaks.map((row) => ({
        analysisId: row.analysis_id,
        projectId: row.project_id,
        leakType: row.leak_type,
        titleKo: row.title_ko,
        reasonKo: row.reason_ko,
        severity: row.severity,
        relatedRequirementId: row.related_requirement_id,
        actionKo: row.action_ko,
        createdAt: row.created_at
      })),
      processCostLeaks: processCostLeaks.map((row) => ({
        leakId: row.leak_id,
        projectId: row.project_id,
        requirementId: row.requirement_id,
        processId: row.process_id,
        costCategory: row.cost_category,
        itemNameKo: row.item_name_ko,
        baselineAmount: row.baseline_amount,
        actualAmount: row.actual_amount,
        varianceAmount: row.variance_amount,
        varianceRate: row.variance_rate,
        severity: row.severity,
        alertMessageKo: row.alert_message_ko,
        updatedAt: row.updated_at
      })),
      rootCauses: rootCauses.map((row) => ({
        rootCauseId: row.root_cause_id,
        leakId: row.leak_id,
        projectId: row.project_id,
        requirementId: row.requirement_id,
        processId: row.process_id,
        costCategory: row.cost_category,
        itemNameKo: row.item_name_ko,
        rootCauseType: row.root_cause_type,
        rootCauseNameKo: row.root_cause_name_ko,
        reasonKo: row.reason_ko,
        status: row.status,
        approvalRequired: Boolean(row.approval_required),
        caseLibraryLink: fromJson(row.case_library_link_json, {}),
        evidence: fromJson(row.evidence_json, {}),
        updatedAt: row.updated_at
      })),
      rootCausePatterns: rootCausePatterns.map((row) => ({
        patternId: row.pattern_id,
        rootCauseType: row.root_cause_type,
        rootCauseNameKo: row.root_cause_name_ko,
        occurrenceCount: row.occurrence_count,
        affectedProjects: fromJson(row.affected_projects_json, []),
        affectedItems: fromJson(row.affected_items_json, []),
        severity: row.severity,
        detectionRuleKo: row.detection_rule_ko,
        updatedAt: row.updated_at
      })),
      vendorPriceSummary: getVendorPriceSummary(),
      rootCauseLearningSuggestions: rootCauseSuggestions.map((row) => ({
        suggestionId: row.suggestion_id,
        patternId: row.pattern_id,
        rootCauseType: row.root_cause_type,
        titleKo: row.title_ko,
        suggestionKo: row.suggestion_ko,
        status: row.status,
        approvalRequired: Boolean(row.approval_required),
        linkedLearningSuggestionId: row.linked_learning_suggestion_id,
        evidence: fromJson(row.evidence_json, {}),
        updatedAt: row.updated_at
      })),
      blockingRules: [
        { ruleId: 'ACC-BLOCK-001', titleKo: '실제 원가 미입력 시 COMPLETION 차단', severity: 'RED' },
        { ruleId: 'ACC-BLOCK-002', titleKo: '핵심 원가 누락 시 RED ALERT', severity: 'RED' },
        { ruleId: 'ACC-ALERT-001', titleKo: '마진 급감 시 CEO Alert', severity: 'YELLOW' }
      ]
    };
  }

  function getVendorPriceSummary() {
    const catalog = db.master.prepare(`
      SELECT price_status, COUNT(*) AS count
      FROM vendor_price_catalog
      GROUP BY price_status
    `).all();
    const history = db.master.prepare(`
      SELECT learning_candidate_status, COUNT(*) AS count
      FROM vendor_price_history
      GROUP BY learning_candidate_status
    `).all();
    const verifiedCount = Number(catalog.find((row) => row.price_status === 'VERIFIED')?.count || 0);
    const needsResearchCount = Number(catalog.find((row) => row.price_status === 'NEEDS_RESEARCH')?.count || 0);
    const pendingApprovalCount = Number(db.master.prepare("SELECT COUNT(*) AS count FROM vendor_price_catalog WHERE approval_status = 'PENDING_CEO_APPROVAL'").get().count || 0);
    const historyCount = history.reduce((sum, row) => sum + Number(row.count || 0), 0);
    return {
      verifiedCatalogCount: verifiedCount,
      needsResearchCatalogCount: needsResearchCount,
      pendingApprovalCount,
      historyCount,
      learningCandidateCount: Number(history.find((row) => row.learning_candidate_status === 'LEARNING_CANDIDATE')?.count || 0),
      displayKo: verifiedCount > 0 ? '실제 공급가 일부 연결' : '실제 공급가 입력 대기',
      warningKo: verifiedCount > 0
        ? 'VERIFIED 공급가는 견적 원가 계산에서 우선 적용됩니다.'
        : 'VERIFIED 공급가가 없어 현재 견적은 기준값/추정값 기반입니다.'
    };
  }

  function getVendorPriceAdminData() {
    seedVendorRealPriceIntegrationLayer();
    const catalog = db.master.prepare(`
      SELECT *
      FROM vendor_price_catalog
      ORDER BY updated_at DESC, material_name_ko
      LIMIT 200
    `).all();
    const mappings = db.master.prepare(`
      SELECT *
      FROM material_price_mapping
      WHERE mapping_status = 'ACTIVE'
      ORDER BY project_type, material_name_ko
    `).all();
    const approvals = db.master.prepare(`
      SELECT *
      FROM vendor_price_approval_logs
      ORDER BY created_at DESC
      LIMIT 100
    `).all();
    const evidence = db.master.prepare(`
      SELECT *
      FROM vendor_price_evidence
      ORDER BY created_at DESC
      LIMIT 100
    `).all();
    return {
      summary: getVendorPriceSummary(),
      catalog: catalog.map((row) => ({
        priceId: row.price_id,
        vendorId: row.vendor_id,
        vendorNameKo: row.vendor_name_ko,
        materialId: row.material_id,
        materialNameKo: row.material_name_ko,
        category: row.category,
        brandName: row.brand_name,
        modelName: row.model_name,
        standardSpec: row.standard_spec,
        unit: row.unit,
        supplierPrice: row.supplier_price,
        internalPrice: row.internal_price,
        priceStatus: row.price_status,
        sourceType: row.source_type,
        sourceName: row.source_name,
        sourceDate: row.source_date,
        confidenceLevel: row.confidence_level,
        approvalStatus: row.approval_status,
        notesKo: row.notes_ko,
        updatedAt: row.updated_at
      })),
      mappings: mappings.map((row) => ({
        mappingId: row.mapping_id,
        projectType: row.project_type,
        itemId: row.item_id,
        materialId: row.material_id,
        materialNameKo: row.material_name_ko,
        category: row.category,
        fallbackBasis: row.fallback_basis
      })),
      approvalLogs: approvals.map((row) => ({
        approvalLogId: row.approval_log_id,
        priceId: row.price_id,
        actionType: row.action_type,
        actor: row.actor,
        reasonKo: row.reason_ko,
        createdAt: row.created_at
      })),
      evidence: evidence.map((row) => ({
        evidenceId: row.evidence_id,
        priceId: row.price_id,
        evidenceType: row.evidence_type,
        evidenceMemoKo: row.evidence_memo_ko,
        sourceDocumentKo: row.source_document_ko,
        createdBy: row.created_by,
        createdAt: row.created_at
      }))
    };
  }

  function createVendorPriceCatalogEntry({
    vendorId = 'MANUAL_VENDOR',
    vendorNameKo,
    materialId,
    materialNameKo,
    category = 'material',
    brandName = 'UNKNOWN',
    modelName = 'UNKNOWN',
    standardSpec = 'UNKNOWN',
    unit = 'EA',
    supplierPrice = 0,
    internalPrice = 0,
    leadTimeDays = '',
    paymentConditionKo = '',
    evidenceMemoKo = '',
    sourceDocumentKo = '',
    actor = 'CEO',
    notesKo = ''
  }) {
    requirePermission({ actor, permissionKey: 'VENDOR_PRICE_INPUT', actionType: 'CREATE_VENDOR_PRICE_PENDING', payload: { materialId, vendorId } });
    if (!vendorNameKo || !materialId || !materialNameKo || !supplierPrice) {
      throw new Error('Vendor price input blocked: vendor, material, and supplier price are required.');
    }
    const createdAt = nowIso();
    const priceId = `VPC-MANUAL-${Date.now()}`;
    db.master.prepare(`
      INSERT INTO vendor_price_catalog (
        price_id, vendor_id, vendor_name_ko, material_id, material_name_ko,
        category, brand_name, model_name, standard_spec, unit,
        supplier_price, internal_price, price_status, source_type,
        source_name, source_date, confidence_level, approval_status,
        notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      priceId,
      vendorId,
      vendorNameKo,
      materialId,
      materialNameKo,
      category,
      brandName,
      modelName,
      standardSpec,
      unit,
      toInteger(supplierPrice),
      toInteger(internalPrice) || toInteger(supplierPrice),
      'PENDING',
      'supplier',
      sourceDocumentKo || '대표 직접 입력',
      createdAt.slice(0, 10),
      evidenceMemoKo ? 'MEDIUM' : 'LOW',
      'PENDING_CEO_APPROVAL',
      [notesKo, leadTimeDays ? `납기 ${leadTimeDays}일` : '', paymentConditionKo ? `결제조건 ${paymentConditionKo}` : ''].filter(Boolean).join(' / '),
      createdAt,
      createdAt
    );

    if (evidenceMemoKo || sourceDocumentKo) {
      db.master.prepare(`
        INSERT INTO vendor_price_evidence (
          evidence_id, price_id, evidence_type, evidence_memo_ko,
          source_document_ko, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `VPE-${priceId}`,
        priceId,
        sourceDocumentKo ? 'DOCUMENT_MEMO' : 'MANUAL_MEMO',
        evidenceMemoKo || '증빙 메모 없음',
        sourceDocumentKo || '문서 미첨부',
        actor,
        createdAt
      );
    }

    recordAction({
      actionType: 'CREATE_VENDOR_PRICE_PENDING',
      actor,
      projectId: 'GLOBAL',
      reasonKo: `${materialNameKo} 공급가 ${Number(supplierPrice).toLocaleString('ko-KR')}원 입력 - 승인 전 견적 반영 금지`,
      payload: { priceId, vendorNameKo, materialId, supplierPrice }
    });

    return { priceId, adminData: getVendorPriceAdminData(), dashboardData: getDashboardData() };
  }

  function decideVendorPriceApproval({ priceId, decision, actor = 'CEO', reasonKo = '' }) {
    requirePermission({ actor, permissionKey: 'VENDOR_PRICE_APPROVE', actionType: `VENDOR_PRICE_${decision}`, payload: { priceId } });
    const price = db.master.prepare('SELECT * FROM vendor_price_catalog WHERE price_id = ?').get(priceId);
    if (!price) throw new Error(`Vendor price not found: ${priceId}`);
    const evidence = db.master.prepare('SELECT * FROM vendor_price_evidence WHERE price_id = ? ORDER BY created_at DESC LIMIT 1').get(priceId);
    if (decision === 'APPROVED' && !evidence) {
      throw new Error('Vendor price approval blocked: evidence is required before APPROVED.');
    }
    const createdAt = nowIso();
    const beforeStatus = {
      priceStatus: price.price_status,
      approvalStatus: price.approval_status,
      supplierPrice: price.supplier_price,
      internalPrice: price.internal_price
    };
    const afterStatus = decision === 'APPROVED'
      ? { priceStatus: 'VERIFIED', approvalStatus: 'APPROVED' }
      : decision === 'REJECTED'
        ? { priceStatus: 'REJECTED', approvalStatus: 'REJECTED' }
        : { priceStatus: 'PENDING', approvalStatus: 'REVISION_REQUESTED' };

    db.master.prepare(`
      INSERT INTO vendor_price_rollback_snapshots (
        snapshot_id, price_id, snapshot_json, rollback_available, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `VPRS-${priceId}-${Date.now()}`,
      priceId,
      toJson(price),
      1,
      actor,
      createdAt
    );

    db.master.prepare(`
      UPDATE vendor_price_catalog
      SET price_status = ?, approval_status = ?, confidence_level = ?, updated_at = ?
      WHERE price_id = ?
    `).run(
      afterStatus.priceStatus,
      afterStatus.approvalStatus,
      decision === 'APPROVED' ? 'HIGH' : price.confidence_level,
      createdAt,
      priceId
    );

    db.master.prepare(`
      INSERT INTO vendor_price_approval_logs (
        approval_log_id, price_id, action_type, before_status_json,
        after_status_json, actor, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `VPAL-${priceId}-${Date.now()}`,
      priceId,
      decision,
      toJson(beforeStatus),
      toJson(afterStatus),
      actor,
      reasonKo || (decision === 'APPROVED' ? '실제 공급가 승인' : decision === 'REJECTED' ? '실제 공급가 반려' : '수정 요청'),
      createdAt
    );

    recordAction({
      actionType: `VENDOR_PRICE_${decision}`,
      actor,
      projectId: 'GLOBAL',
      reasonKo: `${price.material_name_ko} 공급가 ${decision}`,
      payload: { priceId, beforeStatus, afterStatus }
    });

    return { adminData: getVendorPriceAdminData(), dashboardData: getDashboardData() };
  }

  function saveActualCostEntry({
    requirementId,
    amount = 0,
    quantity = 1,
    unit = 'EA',
    vendorId = null,
    vendorNameKo = null,
    sourceDocumentKo = '',
    capturedBy = 'CEO',
    notesKo = ''
  }) {
    const requirement = db.project.prepare('SELECT * FROM cost_capture_requirements WHERE requirement_id = ?').get(requirementId);
    if (!requirement) throw new Error(`Cost capture requirement not found: ${requirementId}`);
    requirePermission({ actor: capturedBy, permissionKey: 'COST_CAPTURE_INPUT', actionType: 'CAPTURE_ACTUAL_COST', payload: { projectId: requirement.project_id, requirementId } });
    const createdAt = nowIso();
    const entryId = `CCE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const safeAmount = toInteger(amount);
    const safeQuantity = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;
    const projectType = resolveProjectTypeFromProject(requirement.project_id);
    const mappedMaterial = resolveMaterialMappingForRequirement({ projectType, requirement });

    db.project.prepare(`
      INSERT INTO cost_capture_entries (
        entry_id, requirement_id, project_id, amount, quantity, unit,
        vendor_id, vendor_name_ko, source_document_ko, captured_by,
        captured_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entryId,
      requirement.requirement_id,
      requirement.project_id,
      safeAmount,
      safeQuantity,
      unit,
      vendorId,
      vendorNameKo,
      sourceDocumentKo,
      capturedBy,
      createdAt,
      toJson({ notesKo, sourceType: requirement.source_type, costCategory: requirement.cost_category })
    );

    if (mappedMaterial && safeAmount > 0) {
      const unitPrice = safeQuantity > 0 ? Math.round(safeAmount / safeQuantity) : safeAmount;
      db.master.prepare(`
        INSERT INTO vendor_price_history (
          history_id, price_id, vendor_id, vendor_name_ko, material_id,
          material_name_ko, project_id, actual_unit_price, quantity, unit,
          total_amount, source_type, source_document_ko, captured_at,
          approval_status, learning_candidate_status, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `VPH-${entryId}`,
        null,
        vendorId,
        vendorNameKo || 'UNKNOWN',
        mappedMaterial.material_id,
        mappedMaterial.material_name_ko,
        requirement.project_id,
        unitPrice,
        safeQuantity,
        unit,
        safeAmount,
        requirement.source_type,
        sourceDocumentKo || 'Actual Cost Capture',
        createdAt,
        'PENDING_APPROVAL',
        getVendorPriceHistoryCount(mappedMaterial.material_id) + 1 >= 2 ? 'LEARNING_CANDIDATE' : 'SINGLE_CASE_ONLY',
        toJson({ requirementId, entryId, costCategory: requirement.cost_category, notesKo })
      );
    }

    db.project.prepare(`
      UPDATE cost_capture_requirements
      SET status = 'CAPTURED', updated_at = ?
      WHERE requirement_id = ?
    `).run(createdAt, requirement.requirement_id);

    const status = recomputeCostCaptureStatus(requirement.project_id, { recordSnapshot: true });

    recordAction({
      actionType: 'CAPTURE_ACTUAL_COST',
      actor: capturedBy,
      projectId: requirement.project_id,
      reasonKo: `${requirement.item_name_ko} 실제 원가 ${safeAmount.toLocaleString('ko-KR')}원 입력`,
      payload: { requirementId, entryId, amount: safeAmount, quantity: safeQuantity, unit, vendorId, vendorNameKo }
    });

    return {
      dashboardData: getDashboardData(),
      costCaptureDashboard: getActualCostCaptureDashboard(),
      entryId,
      status
    };
  }

  function resolveProjectTypeFromProject(projectId) {
    const inputRow = db.project.prepare(`
      SELECT minimum_input_json
      FROM estimate_draft_inputs
      WHERE project_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(projectId);
    if (inputRow) return resolveProjectTypeFromMinimumInput(fromJson(inputRow.minimum_input_json, {}));
    if (String(projectId || '').includes('BATH')) return 'bathroom_remodeling';
    if (String(projectId || '').includes('KITCHEN')) return 'kitchen_remodeling';
    return 'bathroom_remodeling';
  }

  function resolveMaterialMappingForRequirement({ projectType, requirement }) {
    const rows = db.master.prepare(`
      SELECT *
      FROM material_price_mapping
      WHERE project_type = ? AND mapping_status = 'ACTIVE'
      ORDER BY material_name_ko
    `).all(projectType);
    const normalizedText = `${requirement.process_id || ''} ${requirement.cost_category || ''} ${requirement.item_name_ko || ''}`.toLowerCase();
    return rows.find((row) => (
      normalizedText.includes(String(row.material_id || '').toLowerCase()) ||
      normalizedText.includes(String(row.item_id || '').toLowerCase()) ||
      normalizedText.includes(String(row.category || '').toLowerCase()) ||
      String(requirement.item_name_ko || '').includes(row.material_name_ko)
    )) || null;
  }

  function getVendorPriceHistoryCount(materialId) {
    return Number(db.master.prepare('SELECT COUNT(*) AS count FROM vendor_price_history WHERE material_id = ?').get(materialId)?.count || 0);
  }

  function evaluateCostCaptureReadiness({ projectId }) {
    const status = recomputeCostCaptureStatus(projectId);
    const missing = db.project.prepare(`
      SELECT *
      FROM cost_capture_requirements
      WHERE project_id = ?
        AND blocking_level = 'RED'
        AND status IN ('MISSING_CRITICAL', 'NEEDS_RESEARCH')
      ORDER BY item_name_ko
    `).all();

    const marginBlocked = status.liveMargin?.alertLevel === 'RED';
    const marginBlockingReasonsKo = marginBlocked
      ? [`실시간 예상 마진율 ${(Number(status.liveMargin.currentForecastMarginRate || 0) * 100).toFixed(2)}%로 Completion 승인이 차단됩니다.`]
      : [];

    return {
      projectId,
      canComplete: missing.length === 0 && !marginBlocked,
      completionBlocked: missing.length > 0 || marginBlocked,
      blockingReasonsKo: missing.map((row) => `${row.item_name_ko} 미입력`),
      blockingReasonsKo: marginBlocked
        ? missing.map((row) => row.item_name_ko).concat(marginBlockingReasonsKo)
        : missing.map((row) => row.item_name_ko),
      missingCriticalCosts: missing.map((row) => ({
        requirementId: row.requirement_id,
        itemNameKo: row.item_name_ko,
        requiredStage: row.required_stage,
        status: row.status
      })),
      forecast: status
    };
  }

  function getBathroomPricingStandardDashboard() {
    seedBathroomPricingStandardV2();
    const packages = db.master.prepare('SELECT * FROM bathroom_pricing_standards ORDER BY recommended_price ASC').all().map((row) => ({
      standardId: row.standard_id,
      version: row.version,
      packageCode: row.package_code,
      packageNameKo: row.package_name_ko,
      installationMethod: row.installation_method,
      costFloor: row.cost_floor,
      minimumMarginRate: row.minimum_margin_rate,
      minimumAllowedPrice: row.minimum_allowed_price,
      recommendedPrice: row.recommended_price,
      targetMarginRate: row.target_margin_rate,
      includedItemsKo: fromJson(row.included_items_json, []),
      excludedUpsellsKo: fromJson(row.excluded_upsells_json, []),
      ruleStatus: row.rule_status,
      sourceProjectId: row.source_project_id,
      sourceEvidence: fromJson(row.source_evidence_json, {})
    }));
    const options = db.master.prepare('SELECT * FROM bathroom_pricing_options ORDER BY option_type, display_name_ko').all().map((row) => ({
      optionId: row.option_id,
      version: row.version,
      displayNameKo: row.display_name_ko,
      optionType: row.option_type,
      defaultIncluded: Boolean(row.default_included),
      costBasis: row.cost_basis,
      minimumSalePrice: row.minimum_sale_price,
      approvalRequired: Boolean(row.approval_required),
      customerVisible: Boolean(row.customer_visible),
      pricingStatus: row.pricing_status,
      notesKo: row.notes_ko
    }));
    const rules = db.master.prepare('SELECT * FROM margin_safety_rules ORDER BY minimum_margin_rate ASC').all().map((row) => ({
      ruleId: row.rule_id,
      version: row.version,
      ruleName: row.rule_name,
      displayNameKo: row.display_name_ko,
      minimumMarginRate: row.minimum_margin_rate,
      warningMarginRate: row.warning_margin_rate,
      targetMarginRate: row.target_margin_rate,
      blockBelowPrice: row.block_below_price,
      approvalRequired: Boolean(row.approval_required),
      blockingMessageKo: row.blocking_message_ko
    }));
    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      version: 'BATHROOM_PRICING_STANDARD_V2',
      sourceProjectId: 'PRJ-PROD-BATH-0001',
      reverseEngineering: {
        revenue: 5490000,
        actualCost: 5070000,
        actualMargin: 420000,
        actualMarginRate: 0.0765,
        findingKo: '고객가 중심 5,490,000원 견적은 실제 마진율 7.65%로 수익성 기준 미달입니다.'
      },
      packages,
      options,
      rules
    };
  }

  function evaluateBathroomQuote({ packageCode = 'BASIC', offerPrice = 0 }) {
    const standard = db.master.prepare('SELECT * FROM bathroom_pricing_standards WHERE package_code = ? ORDER BY recommended_price ASC LIMIT 1').get(packageCode);
    if (!standard) throw new Error(`Bathroom pricing package not found: ${packageCode}`);
    const price = toInteger(offerPrice);
    const margin = price - standard.cost_floor;
    const marginRate = price > 0 ? Number((margin / price).toFixed(4)) : 0;
    const blocked = price < standard.minimum_allowed_price || marginRate < 0.2;
    const approvalRequired = !blocked && marginRate < 0.25;
    return {
      packageCode,
      offerPrice: price,
      costFloor: standard.cost_floor,
      margin,
      marginRate,
      blocked,
      approvalRequired,
      decisionKo: blocked ? '수주 차단' : approvalRequired ? '대표 승인 필요' : '수주 가능',
      reasonKo: blocked
        ? `최저 방어가 ${Number(standard.minimum_allowed_price).toLocaleString('ko-KR')}원 또는 최소 마진율 20% 기준을 충족하지 못했습니다.`
        : approvalRequired
          ? '20~25% 마진 구간입니다. 계약 전 대표 승인이 필요합니다.'
          : '마진 방어 기준을 통과했습니다.'
    };
  }

  function evaluateKitchenQuote({ packageCode = 'BASIC', offerPrice = 0 }) {
    seedKitchenPricingStandardV1();
    const standard = db.master.prepare('SELECT * FROM kitchen_pricing_standards WHERE package_code = ? ORDER BY recommended_price ASC LIMIT 1').get(packageCode);
    if (!standard) throw new Error(`Kitchen pricing package not found: ${packageCode}`);
    const price = toInteger(offerPrice);
    const margin = price - standard.cost_floor;
    const marginRate = price > 0 ? Number((margin / price).toFixed(4)) : 0;
    const blocked = price < standard.minimum_allowed_price || marginRate < 0.2;
    const approvalRequired = !blocked && marginRate < 0.25;
    return {
      packageCode,
      offerPrice: price,
      costFloor: standard.cost_floor,
      margin,
      marginRate,
      blocked,
      approvalRequired,
      decisionKo: blocked ? '수주 차단' : approvalRequired ? '대표 승인 필요' : '수주 가능',
      reasonKo: blocked
        ? `주방 최소 방어가 ${Number(standard.minimum_allowed_price).toLocaleString('ko-KR')}원 또는 최소 마진율 20% 기준을 통과하지 못했습니다.`
        : approvalRequired
          ? '주방 견적 20~25% 마진 구간입니다. 계약 전 대표 승인이 필요합니다.'
          : '주방 최소 마진 기준을 통과했습니다.'
    };
  }

  function resolveProjectTypeFromMinimumInput(minimumInput = {}) {
    const projectType = minimumInput.projectType || 'bathroom_remodeling';
    const constructionScope = String(minimumInput.constructionScope || '');
    if (projectType === 'kitchen_remodeling' || constructionScope.includes('주방')) return 'kitchen_remodeling';
    if (projectType === 'full_remodel' || projectType === 'apartment_full_remodeling') return 'full_remodel';
    if (projectType === 'restoration') return 'restoration';
    return 'bathroom_remodeling';
  }

  function resolvePriceSourceSummary({ projectType, packageCode, fallbackCost }) {
    seedVendorRealPriceIntegrationLayer();
    const mappings = db.master.prepare(`
      SELECT *
      FROM material_price_mapping
      WHERE project_type = ? AND mapping_status = 'ACTIVE'
      ORDER BY material_name_ko
    `).all(projectType);
    const linkedItems = mappings.map((mapping) => {
      const price = db.master.prepare(`
        SELECT *
        FROM vendor_price_catalog
        WHERE material_id = ? AND price_status = 'VERIFIED' AND approval_status = 'APPROVED'
        ORDER BY source_date DESC, updated_at DESC
        LIMIT 1
      `).get(mapping.material_id);
      const amount = Number(price?.internal_price || price?.supplier_price || 0);
      return {
        itemId: mapping.item_id,
        materialId: mapping.material_id,
        materialNameKo: mapping.material_name_ko,
        category: mapping.category,
        priceBasis: price && amount > 0 ? 'VENDOR_PRICE_VERIFIED' : 'FALLBACK_ESTIMATE',
        vendorId: price?.vendor_id || null,
        vendorNameKo: price?.vendor_name_ko || null,
        unitPrice: amount,
        unit: price?.unit || null,
        sourceDate: price?.source_date || null,
        warningKo: price && amount > 0 ? '실제 공급가 기반' : '실제 공급가 없음: 기준값/추정값 기반'
      };
    });
    const actualItems = linkedItems.filter((item) => item.priceBasis === 'VENDOR_PRICE_VERIFIED');
    const actualTotal = actualItems.reduce((sum, item) => sum + Number(item.unitPrice || 0), 0);
    const allMappedVerified = linkedItems.length > 0 && actualItems.length === linkedItems.length;
    return {
      projectType,
      packageCode,
      costBasis: allMappedVerified ? 'VENDOR_PRICE_VERIFIED' : 'FALLBACK_ESTIMATE',
      displayStatusKo: allMappedVerified ? '실제 공급가 기반' : actualItems.length > 0 ? '일부 실제 공급가 기반' : '추정값 기반',
      effectiveEstimatedCost: allMappedVerified ? actualTotal : fallbackCost,
      fallbackCost,
      actualPriceItemCount: actualItems.length,
      mappedItemCount: linkedItems.length,
      missingPriceItemCount: Math.max(linkedItems.length - actualItems.length, 0),
      actualVendorPriceTotal: actualTotal,
      estimatedFallbackShareRate: linkedItems.length ? Number(((linkedItems.length - actualItems.length) / linkedItems.length).toFixed(4)) : 1,
      linkedItems
    };
  }

  function evaluateProjectTypeQuote({ projectType = 'bathroom_remodeling', packageCode = 'BASIC', offerPrice = 0 }) {
    seedUniversalProjectTypeConfigs();
    const config = db.master.prepare('SELECT * FROM project_type_configs WHERE project_type = ?').get(projectType);
    const standard = db.master.prepare(`
      SELECT *
      FROM project_type_packages
      WHERE project_type = ? AND package_code = ? AND package_status = 'ACTIVE'
      ORDER BY recommended_price ASC
      LIMIT 1
    `).get(projectType, packageCode);

    if (!standard) {
      const fallbackType = projectType === 'kitchen_remodeling' ? 'kitchen_remodeling' : 'bathroom_remodeling';
      const fallbackPackage = db.master.prepare(`
        SELECT *
        FROM project_type_packages
        WHERE project_type = ? AND package_code = ? AND package_status = 'ACTIVE'
        ORDER BY recommended_price ASC
        LIMIT 1
      `).get(fallbackType, packageCode);
      if (!fallbackPackage) throw new Error(`Project type package not found: ${projectType} / ${packageCode}`);
      return evaluateProjectTypeQuote({ projectType: fallbackType, packageCode, offerPrice });
    }

    const priceSourceSummary = resolvePriceSourceSummary({ projectType, packageCode, fallbackCost: standard.cost_floor });
    const estimatedCost = priceSourceSummary.costBasis === 'VENDOR_PRICE_VERIFIED'
      ? priceSourceSummary.effectiveEstimatedCost
      : standard.cost_floor;
    const price = toInteger(offerPrice);
    const margin = price - estimatedCost;
    const marginRate = price > 0 ? Number((margin / price).toFixed(4)) : 0;
    const marginRules = fromJson(config?.margin_rules_json, { blockBelowMarginRate: 0.2, ceoApprovalBelowMarginRate: 0.25, priorityAtMarginRate: 0.3 });
    const blocked = price < standard.minimum_allowed_price || marginRate < Number(marginRules.blockBelowMarginRate || 0.2);
    const approvalRequired = !blocked && marginRate < Number(marginRules.ceoApprovalBelowMarginRate || 0.25);

    return {
      projectType,
      projectTypeNameKo: config?.display_name_ko || projectType,
      packageCode,
      offerPrice: price,
      costFloor: estimatedCost,
      baseCostFloor: standard.cost_floor,
      margin,
      marginRate,
      blocked,
      approvalRequired,
      priceSourceSummary,
      decisionKo: blocked ? '수주 차단' : approvalRequired ? '대표 승인 필요' : '수주 가능',
      reasonKo: blocked
        ? `${config?.display_name_ko || projectType} 최소 방어가 ${Number(standard.minimum_allowed_price).toLocaleString('ko-KR')}원 또는 최소 마진율 20% 기준을 통과하지 못했습니다.`
        : approvalRequired
          ? `${config?.display_name_ko || projectType} 20~25% 마진 구간입니다. 계약 전 대표 승인이 필요합니다.`
          : `${config?.display_name_ko || projectType} 최소 마진 기준을 통과했습니다.`
    };
  }

  function computeMarginSafetyFromMinimumInput(minimumInput = {}) {
    const projectType = resolveProjectTypeFromMinimumInput(minimumInput);
    const config = db.master.prepare('SELECT * FROM project_type_configs WHERE project_type = ?').get(projectType);
    const packageField = config?.package_field || (projectType === 'kitchen_remodeling' ? 'kitchenPackage' : 'bathroomPackage');
    const packageCode = minimumInput[packageField] || 'BASIC';
    const offerPrice = Number(String(minimumInput.customerOfferPrice || '').replace(/[^0-9]/g, ''));
    const evaluation = evaluateProjectTypeQuote({
      projectType,
      packageCode,
      offerPrice: Number.isFinite(offerPrice) ? offerPrice : 0
    });
    return {
      packageCode: evaluation.packageCode,
      estimatedCost: evaluation.costFloor,
      customerOfferPrice: evaluation.offerPrice,
      estimatedMargin: evaluation.margin,
      estimatedMarginRate: evaluation.marginRate,
      marginSafetyStatus: evaluation.blocked ? 'BLOCKED' : evaluation.approvalRequired ? 'CEO_APPROVAL_REQUIRED' : evaluation.marginRate >= 0.3 ? 'PRIORITY' : 'PASS',
      decisionKo: evaluation.decisionKo,
      reasonKo: evaluation.reasonKo,
      priceSourceSummary: evaluation.priceSourceSummary || null
    };
  }

  function getProjectCompletionReadiness({ projectId }) {
    const siteOperation = db.project.prepare('SELECT * FROM site_operations WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    const existingCompletion = db.project.prepare('SELECT * FROM project_completion_reports WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);

    if (!siteOperation) {
      return {
        projectId,
        canComplete: false,
        completionStatus: 'NOT_READY',
        blockingReasonsKo: ['IN_PROGRESS 현장 운영 기록이 없어 완료 처리할 수 없습니다.'],
        warningsKo: [],
        existingCompletionReportId: null
      };
    }

    const blockedProcessesKo = fromJson(siteOperation.blocked_processes_json, []);
    const blockingReasonsKo = [];
    if (siteOperation.site_status !== 'IN_PROGRESS') {
      blockingReasonsKo.push('IN_PROGRESS 상태의 프로젝트만 준공/완료 처리할 수 있습니다.');
    }
    if (blockedProcessesKo.length > 0) {
      blockingReasonsKo.push('검수 실패 또는 차단 공정이 남아 있습니다. 완료 전 해소 여부를 확인해야 합니다.');
    }

    const costReadiness = evaluateCostCaptureReadiness({ projectId });
    if (!costReadiness.canComplete) {
      blockingReasonsKo.push(`Actual Cost Capture V2 차단: ${costReadiness.blockingReasonsKo.join(', ')}`);
    }

    return {
      projectId,
      canComplete: blockingReasonsKo.length === 0,
      completionStatus: existingCompletion?.completion_status || siteOperation.site_status,
      siteOperationId: siteOperation.site_operation_id,
      blockingReasonsKo,
      warningsKo: ['실제 원가 입력 전 최종 마진은 확정되지 않습니다.', 'Master DB는 직접 수정되지 않고 업데이트 후보만 생성됩니다.'],
      existingCompletionReportId: existingCompletion?.completion_report_id || null
    };
  }

  function toInteger(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed);
  }

  function completeProject({
    projectId,
    completionDate,
    finalScopeKo,
    customerFeedbackKo,
    finalContractAmount = 0,
    finalAdditionalWorkAmount = 0,
    actualCosts = {},
    estimatedDurationDays = 0,
    actualDurationDays = 0,
    delayReasonsKo = [],
    defects = [],
    claims = [],
    reworkRequired = false,
    actor = 'CEO'
  }) {
    requirePermission({ actor, permissionKey: 'COMPLETION_APPROVE', actionType: 'COMPLETE_PROJECT', payload: { projectId } });
    const readiness = getProjectCompletionReadiness({ projectId });
    if (!readiness.siteOperationId) throw new Error('Completion blocked: IN_PROGRESS site operation is required.');
    if (!readiness.canComplete) throw new Error(`Completion blocked: ${readiness.blockingReasonsKo.join(' ')}`);

    const createdAt = nowIso();
    const completionReportId = `COMP-${Date.now()}`;
    const materialCost = toInteger(actualCosts.materialCost);
    const laborCost = toInteger(actualCosts.laborCost);
    const subcontractCost = toInteger(actualCosts.subcontractCost);
    const equipmentCost = toInteger(actualCosts.equipmentCost);
    const wasteCost = toInteger(actualCosts.wasteCost);
    const transportCost = toInteger(actualCosts.transportCost);
    const totalActualCost = materialCost + laborCost + subcontractCost + equipmentCost + wasteCost + transportCost;
    const normalizedFinalContractAmount = toInteger(finalContractAmount);
    const normalizedAdditionalAmount = toInteger(finalAdditionalWorkAmount);
    const totalRevenue = normalizedFinalContractAmount + normalizedAdditionalAmount;

    if (totalActualCost <= 0) {
      throw new Error('Completion blocked: actual cost must be entered before final margin confirmation.');
    }

    const normalizedEstimatedDuration = toInteger(estimatedDurationDays);
    const normalizedActualDuration = toInteger(actualDurationDays);
    const durationVarianceDays = normalizedActualDuration - normalizedEstimatedDuration;
    const finalMarginAmount = totalRevenue - totalActualCost;
    const finalMarginRate = totalRevenue > 0 ? Number(((finalMarginAmount / totalRevenue) * 100).toFixed(2)) : 0;
    const costVariance = totalActualCost - normalizedFinalContractAmount;
    const costVarianceRate = normalizedFinalContractAmount > 0 ? Number(((costVariance / normalizedFinalContractAmount) * 100).toFixed(2)) : 0;
    const marginStatus = finalMarginAmount < 0 ? 'LOSS' : finalMarginRate < 15 ? 'LOW_MARGIN' : 'NORMAL';
    const caseLibraryLink = {
      caseStatus: 'CASE_LIBRARY_CANDIDATE',
      linkedDefects: defects,
      linkedClaims: claims,
      reworkRequired: Boolean(reworkRequired)
    };
    const correctionCandidates = [
      {
        targetDb: 'process-db',
        targetItemId: 'actual-cost-calibration',
        reasonKo: '완료 프로젝트의 실제 원가와 예상 기준 차이를 Master DB 보정 후보로 저장합니다.'
      },
      {
        targetDb: 'schedule-db',
        targetItemId: 'actual-duration-calibration',
        reasonKo: '실제 공기와 예정 공기 차이를 향후 공정표 보정 후보로 저장합니다.'
      }
    ];

    db.project.exec('BEGIN IMMEDIATE');
    try {
    db.project.prepare(`
      INSERT INTO project_completion_reports (
        completion_report_id, project_id, site_operation_id, completion_status,
        completion_date, final_scope_ko, customer_feedback_ko, defect_summary_json,
        claim_summary_json, rework_required, case_library_link_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      completionReportId,
      projectId,
      readiness.siteOperationId,
      'COMPLETED',
      completionDate || createdAt.slice(0, 10),
      finalScopeKo || '준공 범위 확인 필요',
      customerFeedbackKo || '고객 피드백 미입력',
      toJson(defects),
      toJson(claims),
      reworkRequired ? 1 : 0,
      toJson(caseLibraryLink),
      createdAt,
      createdAt
    );

    db.project.prepare(`
      INSERT INTO actual_costs (
        actual_cost_id, completion_report_id, project_id, material_cost,
        labor_cost, subcontract_cost, equipment_cost, waste_cost, transport_cost,
        total_actual_cost, cost_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACT-COST-${completionReportId}`,
      completionReportId,
      projectId,
      materialCost,
      laborCost,
      subcontractCost,
      equipmentCost,
      wasteCost,
      transportCost,
      totalActualCost,
      'ACTUAL_ENTERED',
      createdAt,
      createdAt
    );

    db.project.prepare(`
      INSERT INTO actual_durations (
        actual_duration_id, completion_report_id, project_id, estimated_duration_days,
        actual_duration_days, duration_variance_days, delay_reasons_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACT-DUR-${completionReportId}`,
      completionReportId,
      projectId,
      normalizedEstimatedDuration,
      normalizedActualDuration,
      durationVarianceDays,
      toJson(delayReasonsKo),
      createdAt
    );

    db.project.prepare(`
      INSERT INTO final_margin_reports (
        final_margin_report_id, completion_report_id, project_id, final_contract_amount,
        final_additional_work_amount, total_revenue, total_actual_cost,
        final_margin_amount, final_margin_rate, margin_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `MARGIN-${completionReportId}`,
      completionReportId,
      projectId,
      normalizedFinalContractAmount,
      normalizedAdditionalAmount,
      totalRevenue,
      totalActualCost,
      finalMarginAmount,
      finalMarginRate,
      marginStatus,
      createdAt
    );

    db.project.prepare(`
      INSERT INTO estimate_vs_actual_reports (
        report_id, completion_report_id, project_id, estimated_cost, actual_cost,
        cost_variance, cost_variance_rate, estimated_duration_days, actual_duration_days,
        duration_variance_days, variance_reasons_json, correction_candidates_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `EVA-${completionReportId}`,
      completionReportId,
      projectId,
      normalizedFinalContractAmount,
      totalActualCost,
      costVariance,
      costVarianceRate,
      normalizedEstimatedDuration,
      normalizedActualDuration,
      durationVarianceDays,
      toJson([...delayReasonsKo, ...defects, ...claims]),
      toJson(correctionCandidates),
      createdAt
    );

    db.project.prepare(`
      INSERT INTO estimate_vs_actual (
        record_id, project_id, item_name_ko, variance_type, reason_ko, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `EVA-TOP-${completionReportId}`,
      projectId,
      '완료 프로젝트 실제 원가',
      `${costVarianceRate}%`,
      '준공 완료 보고서 기준 예상 vs 실제 오차 저장',
      'Master DB 후보 검토',
      createdAt
    );

    correctionCandidates.forEach((candidate, index) => {
      db.project.prepare(`
        INSERT INTO master_db_update_candidates (
          candidate_id, source_project_id, source_completion_report_id, target_db,
          target_item_id, current_value_json, proposed_value_json, candidate_reason_ko,
          evidence_json, approval_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `MDB-CAND-${completionReportId}-${index + 1}`,
        projectId,
        completionReportId,
        candidate.targetDb,
        candidate.targetItemId,
        toJson({ status: 'NEEDS_RESEARCH' }),
        toJson({
          costVariance,
          costVarianceRate,
          durationVarianceDays,
          finalMarginRate,
          source: 'project_completion_flow'
        }),
        candidate.reasonKo,
        toJson({ completionReportId, totalActualCost, totalRevenue, defects, claims }),
        'PENDING_CEO_APPROVAL',
        createdAt
      );
    });

    db.project.prepare('UPDATE site_operations SET site_status = ?, overall_progress_rate = 100, updated_at = ? WHERE site_operation_id = ?')
      .run('COMPLETED', createdAt, readiness.siteOperationId);
    db.project.prepare(`
      UPDATE projects
      SET current_process_ko = 'COMPLETED',
          progress_rate = '100%',
          risk_level = ?,
          risk_score = ?,
          profit_rate = ?,
          defect_risk_ko = ?,
          next_action_ko = ?,
          updated_at = ?
      WHERE project_id = ?
    `).run(
      reworkRequired || defects.length || claims.length ? 'HIGH' : 'LOW',
      reworkRequired || defects.length || claims.length ? 78 : 24,
      `${finalMarginRate}%`,
      reworkRequired || defects.length || claims.length ? '하자/클레임 Case Library 연결 필요' : '완료',
      'Estimate vs Actual 및 Master DB 후보 검토',
      createdAt,
      projectId
    );
      createProfitTemplateFromCompletion({
        projectId,
        projectType: actualCosts.projectType || 'unknown',
        areaM2: actualCosts.areaM2 || 0,
        actualCosts,
        actualDurationDays: normalizedActualDuration,
        finalMarginRate,
        defects,
        claims,
        reworkRequired,
        estimatedDurationDays: normalizedEstimatedDuration,
        createdAt
      });
      db.project.exec('COMMIT');
    } catch (error) {
      db.project.exec('ROLLBACK');
      throw error;
    }

    writeOperationalLog({
      actionType: 'COMPLETE_PROJECT',
      actor,
      projectId,
      messageKo: `프로젝트 완료 처리: 최종 마진 ${finalMarginRate}%`,
      actionKo: '준공 완료',
      level: marginStatus === 'LOSS' || reworkRequired ? 'WARNING' : 'INFO',
      payload: { completionReportId, totalActualCost, totalRevenue, finalMarginRate, costVarianceRate },
      reasonKo: 'Completion Report 및 Estimate vs Actual 생성',
      createdAt
    });

    const learningResult = runCaseLearningAnalysis({ actor, reasonKo: '완료 프로젝트 자동 Case 등록 및 반복 패턴 분석' });

    return {
      dashboardData: getDashboardData(),
      completionReport: {
        completionReportId,
        projectId,
        totalActualCost,
        totalRevenue,
        finalMarginAmount,
        finalMarginRate,
        costVariance,
        costVarianceRate,
        durationVarianceDays,
        masterDbUpdateCandidateCount: correctionCandidates.length,
        caseLibrary: learningResult
      }
    };
  }

  function classifyCaseCategories({ finalScopeKo = '', defects = [], claims = [], reworkRequired = false, marginStatus = '' }) {
    const sourceText = [finalScopeKo, ...defects, ...claims].join(' ');
    const categoryMap = [
      ['bathroom', '욕실', ['욕실', '양변기', '세면기', '샤워']],
      ['kitchen', '주방', ['주방', '싱크', '상판']],
      ['window', '창호', ['창호', '유리', '결로', '샷시']],
      ['tile', '타일', ['타일', '줄눈', '졸리컷']],
      ['waterproof', '방수', ['방수', '누수']],
      ['paint', '도장', ['도장', '페인트']],
      ['carpentry', '목공', ['목공', '몰딩', '가구']],
      ['electrical', '전기', ['전기', '조명', '콘센트']],
      ['condensation', '결로', ['결로']],
      ['leak', '누수', ['누수']],
      ['defect', '하자', ['하자', '보완', '불량']],
      ['change_order', '추가공사', ['추가공사']]
    ];
    const detected = categoryMap
      .filter(([, , keywords]) => keywords.some((keyword) => sourceText.includes(keyword)))
      .map(([category, displayNameKo]) => ({ category, displayNameKo }));

    if (reworkRequired && !detected.some((item) => item.category === 'defect')) {
      detected.push({ category: 'defect', displayNameKo: '하자' });
    }
    if (marginStatus === 'LOSS' && !detected.some((item) => item.category === 'loss')) {
      detected.push({ category: 'loss', displayNameKo: '마진 손실' });
    }
    if (detected.length === 0) detected.push({ category: 'general', displayNameKo: '일반' });
    return detected;
  }

  function syncCaseLibraryFromCompletions({ actor = 'BOC' } = {}) {
    const createdAt = nowIso();
    const completionRows = db.project.prepare(`
      SELECT
        completion.*,
        actual.total_actual_cost,
        actual.material_cost,
        actual.labor_cost,
        actual.subcontract_cost,
        actual.equipment_cost,
        actual.waste_cost,
        actual.transport_cost,
        duration.estimated_duration_days,
        duration.actual_duration_days,
        duration.duration_variance_days,
        margin.final_margin_amount,
        margin.final_margin_rate,
        margin.margin_status
      FROM project_completion_reports completion
      LEFT JOIN actual_costs actual ON actual.completion_report_id = completion.completion_report_id
      LEFT JOIN actual_durations duration ON duration.completion_report_id = completion.completion_report_id
      LEFT JOIN final_margin_reports margin ON margin.completion_report_id = completion.completion_report_id
      ORDER BY completion.created_at
    `).all();

    let insertedCount = 0;
    completionRows.forEach((row) => {
      const defects = fromJson(row.defect_summary_json, []);
      const claims = fromJson(row.claim_summary_json, []);
      const categories = classifyCaseCategories({
        finalScopeKo: row.final_scope_ko,
        defects,
        claims,
        reworkRequired: Boolean(row.rework_required),
        marginStatus: row.margin_status
      });
      const changeOrders = db.project.prepare('SELECT * FROM change_order_requests WHERE project_id = ?').all(row.project_id).map((changeOrder) => ({
        changeOrderId: changeOrder.change_order_id,
        titleKo: changeOrder.title_ko,
        approvalStatus: changeOrder.approval_status
      }));
      const result = db.project.prepare(`
        INSERT OR IGNORE INTO case_library (
          case_id, source_project_id, source_completion_report_id, categories_json,
          actual_cost_json, actual_duration_json, defects_json, claims_json,
          change_orders_json, final_margin_json, case_status, learning_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `CASE-${row.completion_report_id}`,
        row.project_id,
        row.completion_report_id,
        toJson(categories),
        toJson({
          totalActualCost: row.total_actual_cost || 0,
          materialCost: row.material_cost || 0,
          laborCost: row.labor_cost || 0,
          subcontractCost: row.subcontract_cost || 0,
          equipmentCost: row.equipment_cost || 0,
          wasteCost: row.waste_cost || 0,
          transportCost: row.transport_cost || 0
        }),
        toJson({
          estimatedDurationDays: row.estimated_duration_days || 0,
          actualDurationDays: row.actual_duration_days || 0,
          durationVarianceDays: row.duration_variance_days || 0
        }),
        toJson(defects),
        toJson(claims),
        toJson(changeOrders),
        toJson({
          finalMarginAmount: row.final_margin_amount || 0,
          finalMarginRate: row.final_margin_rate || 0,
          marginStatus: row.margin_status || 'UNKNOWN'
        }),
        'REGISTERED',
        'READY_FOR_PATTERN_DETECTION',
        row.created_at || createdAt,
        createdAt
      );
      insertedCount += result.changes || 0;
    });

    if (insertedCount > 0) {
      writeOperationalLog({
        actionType: 'SYNC_CASE_LIBRARY',
        actor,
        projectId: 'GLOBAL',
        messageKo: `Case Library 자동 등록 ${insertedCount}건`,
        actionKo: 'Case 등록',
        level: 'INFO',
        payload: { insertedCount },
        reasonKo: '완료 프로젝트를 Case Library에 등록',
        createdAt
      });
    }

    return { syncedCaseCount: completionRows.length, insertedCaseCount: insertedCount };
  }

  function upsertLearningSuggestion({ patternId, suggestionType, titleKo, suggestionKo, evidence, targetDb, targetItemId, createdAt }) {
    const suggestionId = `SUG-${patternId}`;
    const approvalId = `APP-LEARN-${suggestionId}`;
    db.project.prepare(`
      INSERT OR IGNORE INTO learning_suggestions (
        suggestion_id, pattern_id, suggestion_type, title_ko, suggestion_ko,
        approval_required, approval_id, status, rollback_required, evidence_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      suggestionId,
      patternId,
      suggestionType,
      titleKo,
      suggestionKo,
      1,
      approvalId,
      'PENDING_CEO_APPROVAL',
      1,
      toJson(evidence),
      createdAt,
      createdAt
    );

    db.project.prepare(`
      INSERT OR IGNORE INTO auto_update_candidates (
        candidate_id, suggestion_id, target_db, target_item_id, proposed_change_json,
        approval_status, rollback_data_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `AUTO-CAND-${suggestionId}`,
      suggestionId,
      targetDb,
      targetItemId,
      toJson({ suggestionType, titleKo, evidence, autoApplyAllowed: false }),
      'PENDING_CEO_APPROVAL',
      toJson({ rollbackAvailable: true, beforeValue: 'CURRENT_MASTER_DB_VALUE_REQUIRED' }),
      createdAt
    );

    db.approval.prepare(`
      INSERT OR IGNORE INTO approvals (
        approval_id, project_id, approval_type, title_ko, reason_ko, status,
        rollback_required, rollback_status, blocking_impact_ko, requested_by,
        requested_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      approvalId,
      evidence.projectIds?.[0] || 'GLOBAL',
      'LearningSuggestion',
      titleKo,
      suggestionKo,
      'PENDING_CEO_APPROVAL',
      1,
      'READY',
      '대표 승인 전 Master DB 자동 반영 금지',
      'BOC Learning Engine',
      createdAt,
      createdAt
    );
    db.approval.prepare(`
      UPDATE approvals
      SET approval_type = 'LearningSuggestion',
          rollback_required = 1,
          rollback_status = 'READY',
          blocking_impact_ko = '대표 승인 전 Master DB 자동 반영 금지',
          updated_at = ?
      WHERE approval_id = ?
        AND requested_by = 'BOC Learning Engine'
        AND status = 'PENDING_CEO_APPROVAL'
    `).run(createdAt, approvalId);

    return suggestionId;
  }

  function runCaseLearningAnalysis({ actor = 'BOC', reasonKo = 'Case Library 반복 패턴 분석' } = {}) {
    const createdAt = nowIso();
    const syncResult = syncCaseLibraryFromCompletions({ actor });
    const caseRows = db.project.prepare('SELECT * FROM case_library ORDER BY created_at').all();
    const grouped = new Map();

    caseRows.forEach((row) => {
      const categories = fromJson(row.categories_json, []);
      const defects = fromJson(row.defects_json, []);
      const claims = fromJson(row.claims_json, []);
      const finalMargin = fromJson(row.final_margin_json, {});
      categories.forEach((category) => {
        const key = category.category;
        const current = grouped.get(key) || {
          category: key,
          displayNameKo: category.displayNameKo || key,
          cases: [],
          defectCount: 0,
          claimCount: 0,
          lossCount: 0,
          profitCount: 0
        };
        current.cases.push(row);
        current.defectCount += defects.length;
        current.claimCount += claims.length;
        current.lossCount += finalMargin.marginStatus === 'LOSS' || Number(finalMargin.finalMarginRate || 0) < 15 ? 1 : 0;
        current.profitCount += Number(finalMargin.finalMarginRate || 0) >= 25 ? 1 : 0;
        grouped.set(key, current);
      });
    });

    let defectPatternCount = 0;
    let profitPatternCount = 0;
    let suggestionCount = 0;

    grouped.forEach((group) => {
      const evidence = {
        category: group.category,
        displayNameKo: group.displayNameKo,
        occurrenceCount: group.cases.length,
        defectCount: group.defectCount,
        claimCount: group.claimCount,
        lossCount: group.lossCount,
        profitCount: group.profitCount,
        projectIds: group.cases.map((row) => row.source_project_id),
        caseIds: group.cases.map((row) => row.case_id)
      };

      if (group.cases.length >= 2 && (group.defectCount > 0 || group.claimCount > 0 || group.lossCount >= 2)) {
        const patternId = `PAT-DEF-${group.category}`;
        db.project.prepare(`
          INSERT OR REPLACE INTO defect_patterns (
            pattern_id, category, pattern_name_ko, occurrence_count, severity,
            evidence_json, detection_rule_ko, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM defect_patterns WHERE pattern_id = ?), ?), ?)
        `).run(
          patternId,
          group.category,
          `${group.displayNameKo} 반복 손실/하자 패턴`,
          group.cases.length,
          group.claimCount > 0 || group.lossCount >= 2 ? 'HIGH' : 'MEDIUM',
          toJson(evidence),
          '동일 카테고리 완료 Case 2건 이상 + 하자/클레임/저마진 반복',
          patternId,
          createdAt,
          createdAt
        );
        defectPatternCount += 1;
        suggestionCount += 1;
        upsertLearningSuggestion({
          patternId,
          suggestionType: 'MASTER_DB_CORRECTION',
          titleKo: `${group.displayNameKo} 기준값 보정 승인 요청`,
          suggestionKo: '단일 사례가 아닌 반복 Case 기준입니다. 품수, 단가, 공기, Vendor/Brand 추천값 보정을 검토해야 합니다.',
          evidence,
          targetDb: `${group.category}-master-db`,
          targetItemId: `${group.category}-correction-rule`,
          createdAt
        });
      }

      if (group.cases.length >= 2 && group.profitCount >= 2) {
        const patternId = `PAT-PROFIT-${group.category}`;
        db.project.prepare(`
          INSERT OR REPLACE INTO profit_patterns (
            pattern_id, category, pattern_name_ko, occurrence_count, profit_signal_ko,
            evidence_json, detection_rule_ko, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM profit_patterns WHERE pattern_id = ?), ?), ?)
        `).run(
          patternId,
          group.category,
          `${group.displayNameKo} 반복 수익 패턴`,
          group.profitCount,
          '마진율 25% 이상 반복',
          toJson(evidence),
          '동일 카테고리 완료 Case 2건 이상 + 마진율 25% 이상 2건 이상',
          patternId,
          createdAt,
          createdAt
        );
        profitPatternCount += 1;
        suggestionCount += 1;
        upsertLearningSuggestion({
          patternId,
          suggestionType: 'RECOMMENDATION_UPDATE',
          titleKo: `${group.displayNameKo} 수익 패턴 추천값 반영 검토`,
          suggestionKo: '반복 수익 패턴입니다. 선호 Vendor, Brand, 선발주 조건, 표준 사양 추천값 반영을 검토합니다.',
          evidence,
          targetDb: `${group.category}-recommendation-db`,
          targetItemId: `${group.category}-profit-rule`,
          createdAt
        });
      }
    });

    if (defectPatternCount || profitPatternCount || suggestionCount) {
      writeOperationalLog({
        actionType: 'RUN_CASE_LEARNING_ANALYSIS',
        actor,
        projectId: 'GLOBAL',
        messageKo: `Case Learning 분석 완료: 제안 ${suggestionCount}건`,
        actionKo: 'Learning',
        level: defectPatternCount ? 'WARNING' : 'INFO',
        payload: { defectPatternCount, profitPatternCount, suggestionCount },
        reasonKo,
        createdAt
      });
    }

    return {
      ...syncResult,
      totalCaseCount: caseRows.length,
      defectPatternCount,
      profitPatternCount,
      suggestionCount
    };
  }

  function getCaseLibrarySnapshot() {
    runCaseLearningAnalysis({ actor: 'BOC', reasonKo: 'Case Library 화면 조회 전 동기화' });
    return {
      rootCausePatterns: (syncCostLeakRootCauses(null, nowIso()), db.project.prepare('SELECT * FROM root_cause_patterns ORDER BY occurrence_count DESC, updated_at DESC LIMIT 10').all().map((row) => ({
        patternId: row.pattern_id,
        rootCauseType: row.root_cause_type,
        rootCauseNameKo: row.root_cause_name_ko,
        occurrenceCount: row.occurrence_count,
        affectedProjects: fromJson(row.affected_projects_json, []),
        affectedItems: fromJson(row.affected_items_json, []),
        severity: row.severity,
        detectionRuleKo: row.detection_rule_ko
      }))),
      rootCauseLearningSuggestions: db.project.prepare('SELECT * FROM root_cause_learning_suggestions ORDER BY updated_at DESC LIMIT 10').all().map((row) => ({
        suggestionId: row.suggestion_id,
        patternId: row.pattern_id,
        rootCauseType: row.root_cause_type,
        titleKo: row.title_ko,
        suggestionKo: row.suggestion_ko,
        status: row.status,
        approvalRequired: Boolean(row.approval_required),
        linkedLearningSuggestionId: row.linked_learning_suggestion_id,
        evidence: fromJson(row.evidence_json, {})
      })),
      cases: db.project.prepare('SELECT * FROM case_library ORDER BY updated_at DESC LIMIT 30').all().map((row) => ({
        caseId: row.case_id,
        projectId: row.source_project_id,
        completionReportId: row.source_completion_report_id,
        categories: fromJson(row.categories_json, []),
        actualCost: fromJson(row.actual_cost_json, {}),
        actualDuration: fromJson(row.actual_duration_json, {}),
        defects: fromJson(row.defects_json, []),
        claims: fromJson(row.claims_json, []),
        changeOrders: fromJson(row.change_orders_json, []),
        finalMargin: fromJson(row.final_margin_json, {}),
        caseStatus: row.case_status,
        learningStatus: row.learning_status
      })),
      defectPatterns: db.project.prepare('SELECT * FROM defect_patterns ORDER BY occurrence_count DESC, updated_at DESC').all().map((row) => ({
        patternId: row.pattern_id,
        category: row.category,
        patternNameKo: row.pattern_name_ko,
        occurrenceCount: row.occurrence_count,
        severity: row.severity,
        evidence: fromJson(row.evidence_json, {}),
        detectionRuleKo: row.detection_rule_ko
      })),
      profitPatterns: db.project.prepare('SELECT * FROM profit_patterns ORDER BY occurrence_count DESC, updated_at DESC').all().map((row) => ({
        patternId: row.pattern_id,
        category: row.category,
        patternNameKo: row.pattern_name_ko,
        occurrenceCount: row.occurrence_count,
        profitSignalKo: row.profit_signal_ko,
        evidence: fromJson(row.evidence_json, {}),
        detectionRuleKo: row.detection_rule_ko
      })),
      suggestions: db.project.prepare('SELECT * FROM learning_suggestions ORDER BY updated_at DESC').all().map((row) => ({
        suggestionId: row.suggestion_id,
        patternId: row.pattern_id,
        suggestionType: row.suggestion_type,
        titleKo: row.title_ko,
        suggestionKo: row.suggestion_ko,
        approvalRequired: Boolean(row.approval_required),
        approvalId: row.approval_id,
        status: row.status,
        rollbackRequired: Boolean(row.rollback_required),
        evidence: fromJson(row.evidence_json, {})
      })),
      autoUpdateCandidates: db.project.prepare('SELECT * FROM auto_update_candidates ORDER BY created_at DESC').all().map((row) => ({
        candidateId: row.candidate_id,
        suggestionId: row.suggestion_id,
        targetDb: row.target_db,
        targetItemId: row.target_item_id,
        proposedChange: fromJson(row.proposed_change_json, {}),
        approvalStatus: row.approval_status,
        rollbackData: fromJson(row.rollback_data_json, {})
      }))
    };
  }

  function getLearningSuggestionByApprovalId(approvalId) {
    return db.project.prepare('SELECT * FROM learning_suggestions WHERE approval_id = ?').get(approvalId);
  }

  function getAutoUpdateCandidateBySuggestionId(suggestionId) {
    return db.project.prepare('SELECT * FROM auto_update_candidates WHERE suggestion_id = ? ORDER BY created_at DESC LIMIT 1').get(suggestionId);
  }

  function handleLearningSuggestionApprovalDecision({ approval, decision, actor, reasonKo, createdAt }) {
    const suggestion = getLearningSuggestionByApprovalId(approval.approval_id);
    if (!suggestion) return null;

    const candidate = getAutoUpdateCandidateBySuggestionId(suggestion.suggestion_id);
    if (!candidate) throw new Error(`Learning update candidate not found: ${suggestion.suggestion_id}`);

    const beforeStatus = suggestion.status;
    let afterStatus = beforeStatus;
    let masterDbRequestId = null;
    let rollbackSnapshotId = null;
    let effectiveDecision = decision;
    let effectiveReasonKo = reasonKo || decisionToKorean(decision);

    if (decision === 'APPROVED') {
      const caseCount = Number(fromJson(suggestion.evidence_json, {}).occurrenceCount || 0);
      if (caseCount < 2) {
        throw new Error('Learning suggestion approval blocked: single-case update is not allowed.');
      }

      const rollbackData = fromJson(candidate.rollback_data_json, {});
      if (!rollbackData.rollbackAvailable) {
        throw new Error('Learning suggestion approval blocked: rollback snapshot is required.');
      }

      const currentValue = db.master.prepare('SELECT * FROM master_db_values WHERE item_id = ? AND target_db = ?').get(candidate.target_item_id, candidate.target_db);
      const beforeValue = currentValue ? fromJson(currentValue.value_json, {}) : { status: 'EMPTY', source: 'LearningApprovalFlow' };
      const afterValue = fromJson(candidate.proposed_change_json, {});
      if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
        throw new Error('Learning suggestion approval blocked: before/after values must be different.');
      }

      rollbackSnapshotId = `LEARN-SNAP-${suggestion.suggestion_id}`;
      masterDbRequestId = `MDB-REQ-LEARN-${suggestion.suggestion_id}`;

      db.project.prepare(`
        INSERT OR REPLACE INTO learning_update_snapshots (
          snapshot_id, suggestion_id, candidate_id, target_db, target_item_id,
          before_value_json, after_value_json, approval_id, rollback_available, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rollbackSnapshotId,
        suggestion.suggestion_id,
        candidate.candidate_id,
        candidate.target_db,
        candidate.target_item_id,
        toJson(beforeValue),
        toJson(afterValue),
        approval.approval_id,
        1,
        createdAt
      );

      db.master.prepare(`
        INSERT OR REPLACE INTO master_db_update_requests (
          request_id, source_project_id, target_db, target_item_id,
          current_value_json, proposed_value_json, change_reason_ko,
          evidence_json, impact_analysis_json, risk_level, approval_status,
          rollback_data_json, requested_by, requested_at, approved_by, approved_at, applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        masterDbRequestId,
        approval.project_id,
        candidate.target_db,
        candidate.target_item_id,
        toJson(beforeValue),
        toJson(afterValue),
        suggestion.suggestion_ko,
        suggestion.evidence_json,
        toJson({ source: 'LearningSuggestionApprovalFlow', roiReviewRequired: suggestion.suggestion_type === 'RECOMMENDATION_UPDATE' }),
        suggestion.suggestion_type === 'MASTER_DB_CORRECTION' ? 'HIGH' : 'MEDIUM',
        'APPROVED',
        toJson({ snapshotId: rollbackSnapshotId, rollbackAvailable: true, beforeValue }),
        'BOC Learning Engine',
        createdAt,
        actor,
        createdAt,
        createdAt
      );

      db.master.prepare(`
        INSERT OR REPLACE INTO master_db_values (
          item_id, target_db, value_json, version, updated_by, updated_at, approval_id
        ) VALUES (?, ?, ?, COALESCE((SELECT version + 1 FROM master_db_values WHERE item_id = ?), 1), ?, ?, ?)
      `).run(candidate.target_item_id, candidate.target_db, toJson(afterValue), candidate.target_item_id, actor, createdAt, approval.approval_id);

      db.master.prepare(`
        INSERT INTO master_db_rollback_snapshots (
          snapshot_id, request_id, target_item_id, before_value_json, after_value_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(`ROLLBACK-${rollbackSnapshotId}`, masterDbRequestId, candidate.target_item_id, toJson(beforeValue), toJson(afterValue), createdAt);

      afterStatus = 'APPROVED_APPLIED';
      db.project.prepare('UPDATE learning_suggestions SET status = ?, updated_at = ? WHERE suggestion_id = ?')
        .run(afterStatus, createdAt, suggestion.suggestion_id);
      db.project.prepare('UPDATE auto_update_candidates SET approval_status = ? WHERE candidate_id = ?')
        .run('APPROVED_APPLIED', candidate.candidate_id);
    } else if (decision === 'REJECTED') {
      afterStatus = 'REJECTED';
      db.project.prepare('UPDATE learning_suggestions SET status = ?, updated_at = ? WHERE suggestion_id = ?')
        .run(afterStatus, createdAt, suggestion.suggestion_id);
      db.project.prepare('UPDATE auto_update_candidates SET approval_status = ? WHERE candidate_id = ?')
        .run('REJECTED', candidate.candidate_id);
    } else {
      afterStatus = 'REVISION_REQUESTED';
      effectiveDecision = 'REVISION_REQUESTED';
      effectiveReasonKo = reasonKo || 'Learning Suggestion 수정 요청';
      db.project.prepare('UPDATE learning_suggestions SET status = ?, updated_at = ? WHERE suggestion_id = ?')
        .run(afterStatus, createdAt, suggestion.suggestion_id);
      db.project.prepare('UPDATE auto_update_candidates SET approval_status = ? WHERE candidate_id = ?')
        .run('REVISION_REQUESTED', candidate.candidate_id);

      db.approval.prepare(`
        INSERT OR IGNORE INTO approvals (
          approval_id, project_id, approval_type, title_ko, reason_ko, status,
          rollback_required, rollback_status, blocking_impact_ko, requested_by,
          requested_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `APP-LEARN-REV-${suggestion.suggestion_id}`,
        approval.project_id,
        'LearningSuggestion',
        `Learning Suggestion 수정 재검토: ${suggestion.title_ko}`,
        effectiveReasonKo,
        'PENDING_CEO_APPROVAL',
        1,
        'READY',
        '수정 승인 전 Master DB 반영 금지',
        'BOC Learning Engine',
        createdAt,
        createdAt
      );
    }

    db.project.prepare(`
      INSERT INTO learning_approval_logs (
        learning_approval_log_id, suggestion_id, candidate_id, approval_id,
        action_type, before_status, after_status, master_db_request_id,
        rollback_snapshot_id, reason_ko, actor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LEARN-APPLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      suggestion.suggestion_id,
      candidate.candidate_id,
      approval.approval_id,
      effectiveDecision,
      beforeStatus,
      afterStatus,
      masterDbRequestId,
      rollbackSnapshotId,
      effectiveReasonKo,
      actor,
      createdAt
    );

    return { effectiveDecision, effectiveReasonKo, suggestionId: suggestion.suggestion_id, afterStatus, masterDbRequestId, rollbackSnapshotId };
  }

  function nextBlockedProcessesForInspection(inspectionType, relatedProcessId) {
    if (inspectionType === 'WATERPROOF' || relatedProcessId === 'waterproofing') {
      return ['tile', 'jolly_cut', 'grout', 'silicone'];
    }
    if (inspectionType === 'ELECTRICAL') {
      return ['lighting', 'ceiling_close'];
    }
    return ['next_process'];
  }

  function addSiteRisk({ siteOperation, riskType, severity, descriptionKo, linkedIssueId = null, createdAt }) {
    db.project.prepare(`
      INSERT INTO site_risk_logs (
        risk_log_id, site_operation_id, project_id, risk_type,
        severity, description_ko, linked_issue_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `RISK-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      siteOperation.site_operation_id,
      siteOperation.project_id,
      riskType,
      severity,
      descriptionKo,
      linkedIssueId,
      createdAt
    );
  }

  function writeOperationalLog({ actionType, actor, projectId, messageKo, actionKo, level, payload, reasonKo, createdAt }) {
    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACTLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      actionType,
      actor,
      projectId,
      null,
      toJson(payload),
      reasonKo,
      createdAt
    );

    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      level,
      messageKo,
      projectId,
      actionKo,
      createdAt
    );
  }

  function buildTopBar() {
    const costStatus = db.project.prepare('SELECT * FROM cost_capture_status ORDER BY missing_critical_count DESC LIMIT 1').get();
    const portfolioStats = db.project.prepare(`
      SELECT
        COUNT(*) AS project_count,
        SUM(revenue_amount) AS total_revenue,
        SUM(expected_margin) AS total_margin,
        SUM(CASE WHEN red_alert_count > 0 OR risk_level IN ('BLOCKING', 'HIGH') THEN 1 ELSE 0 END) AS risk_count
      FROM portfolio_projects
    `).get();
    const crewStats = db.project.prepare(`
      SELECT
        COUNT(*) AS risk_count,
        SUM(CASE WHEN severity = 'RED' THEN 1 ELSE 0 END) AS red_count
      FROM crew_risk_logs
      WHERE status = 'ACTIVE'
    `).get();
    const financeStats = db.project.prepare(`
      SELECT *
      FROM monthly_profit_loss
      WHERE month_key = ?
    `).get(currentMonthKey());
    const salesStats = db.project.prepare(`
      SELECT *
      FROM sales_pipeline_metrics
      WHERE month_key = ?
    `).get(currentMonthKey()) || syncSalesPipelineMetrics();
    const profitSummary = getProfitGenerationSummary();
    const automationStats = db.logs.prepare(`
      SELECT
        SUM(CASE WHEN severity IN ('RED', 'BLOCKING') THEN 1 ELSE 0 END) AS red_count,
        COUNT(*) AS active_count
      FROM event_triggers
      WHERE status = 'ACTIVE'
    `).get();
    const lowMarginStats = db.project.prepare(`
      SELECT
        SUM(CASE WHEN margin_safety_status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked_count,
        SUM(CASE WHEN margin_safety_status = 'CEO_APPROVAL_REQUIRED' THEN 1 ELSE 0 END) AS approval_count,
        AVG(CASE WHEN estimated_margin_rate > 0 THEN estimated_margin_rate ELSE NULL END) AS avg_margin_rate
      FROM estimate_drafts
      WHERE draft_status IN ('PRELIMINARY', 'FINAL_ESTIMATE')
    `).get();
    const captureKpi = costStatus
      ? {
          id: 'actualCostCapture',
          labelKo: '실제 원가 누락',
          value: `${costStatus.missing_critical_count}건`,
          helperKo: `예상 남는 돈 ${Number(costStatus.forecast_margin).toLocaleString('ko-KR')}원`,
          severity: costStatus.missing_critical_count > 0 ? 'RED' : 'GREEN',
          action: 'openCostCapture'
        }
      : { id: 'actualCostCapture', labelKo: '실제 원가 누락', value: '0건', helperKo: '캡처 대상 없음', severity: 'GREEN', action: 'openCostCapture' };
    const blockedCount = Number(lowMarginStats?.blocked_count || 0);
    const approvalCount = Number(lowMarginStats?.approval_count || 0);
    const avgMarginRate = Number(lowMarginStats?.avg_margin_rate || 0);
    const marginKpi = {
      id: 'marginSafety',
      labelKo: '저마진 견적',
      value: `${blockedCount}건`,
      helperKo: `승인필요 ${approvalCount}건 / 평균 ${(avgMarginRate * 100).toFixed(1)}%`,
      severity: blockedCount > 0 ? 'RED' : approvalCount > 0 ? 'YELLOW' : 'GREEN',
      action: 'openMarginSafety'
    };
    const vendorSummary = getVendorPriceSummary();
    const vendorKpi = {
      id: 'vendorPriceApproval',
      labelKo: '공급가 승인 대기',
      value: `${vendorSummary.pendingApprovalCount || 0}건`,
      helperKo: `실단가 ${vendorSummary.verifiedCatalogCount}개 / 추정값 ${vendorSummary.needsResearchCatalogCount}개`,
      severity: (vendorSummary.pendingApprovalCount || 0) > 0 ? 'YELLOW' : 'GREEN',
      action: 'openVendorPriceAdmin'
    };
    const automationKpi = {
      id: 'automationEventMonitor',
      labelKo: '자동 감지 이벤트',
      value: `${Number(automationStats?.active_count || 0)}건`,
      helperKo: `RED ${Number(automationStats?.red_count || 0)}건 / 5분·1시간·1일 감시`,
      severity: Number(automationStats?.red_count || 0) > 0 ? 'RED' : Number(automationStats?.active_count || 0) > 0 ? 'YELLOW' : 'GREEN',
      action: 'openBlockingAlerts'
    };
    const portfolioKpi = {
      id: 'portfolioControl',
      labelKo: 'Portfolio',
      value: `${Number(portfolioStats?.project_count || 0)}개`,
      helperKo: `총매출 ${Number(portfolioStats?.total_revenue || 0).toLocaleString('ko-KR')}원 / 위험 ${Number(portfolioStats?.risk_count || 0)}개`,
      severity: Number(portfolioStats?.risk_count || 0) > 0 ? 'RED' : 'GREEN',
      action: 'openPortfolio'
    };
    const crewKpi = {
      id: 'crewControl',
      labelKo: 'Crew',
      value: `${Number(crewStats?.risk_count || 0)}건`,
      helperKo: `인력 리스크 / RED ${Number(crewStats?.red_count || 0)}건`,
      severity: Number(crewStats?.red_count || 0) > 0 ? 'RED' : Number(crewStats?.risk_count || 0) > 0 ? 'YELLOW' : 'GREEN',
      action: 'openCrew'
    };
    const financeKpi = {
      id: 'companyFinance',
      labelKo: '회사 영업이익',
      value: `${Number(financeStats?.operating_profit || 0).toLocaleString('ko-KR')}원`,
      helperKo: `고정비 ${Number(financeStats?.monthly_fixed_cost || 0).toLocaleString('ko-KR')}원 / 순현금 ${Number(financeStats?.net_cashflow || 0).toLocaleString('ko-KR')}원`,
      severity: !financeStats || Number(financeStats.operating_profit || 0) < 0 || Number(financeStats.net_cashflow || 0) < 0 ? 'RED' : 'GREEN',
      action: 'openFinance'
    };
    const salesKpi = {
      id: 'salesPipeline',
      labelKo: '영업 파이프라인',
      value: `${Number(salesStats?.pipeline_amount || 0).toLocaleString('ko-KR')}원`,
      helperKo: `리드 ${Number(salesStats?.total_leads || 0)}건 / 계약전환 ${(Number(salesStats?.contract_conversion_rate || 0) * 100).toFixed(1)}%`,
      severity: Number(salesStats?.total_leads || 0) === 0 ? 'YELLOW' : Number(salesStats?.contract_conversion_rate || 0) < 0.2 ? 'YELLOW' : 'GREEN',
      action: 'openSales'
    };
    const profitEngineKpi = {
      id: 'profitEngine',
      labelKo: 'Profit Engine',
      value: `${Number(profitSummary.monthlyExpectedNetProfit || 0).toLocaleString('ko-KR')}원`,
      helperKo: `손실방어 ${Number(profitSummary.lossDefenseAmount || 0).toLocaleString('ko-KR')}원 / BLOCK ${profitSummary.blockedEstimateCount}건`,
      severity: profitSummary.blockedEstimateCount > 0 ? 'RED' : profitSummary.lowMarginProjectCount > 0 ? 'YELLOW' : 'GREEN',
      action: 'openProfitTemplates'
    };
    const topBarLiveMarginSource = costStatus
      ? getLatestLiveMarginSnapshot(costStatus.project_id) || buildLiveMarginSnapshot(costStatus.project_id, costStatus.revenue, costStatus.captured_cost, costStatus.updated_at)
      : null;
    const liveMarginKpi = topBarLiveMarginSource
      ? {
          id: 'liveMarginRate',
          labelKo: '현재 예상 마진율',
          value: `${(Number(topBarLiveMarginSource.currentForecastMarginRate || 0) * 100).toFixed(1)}%`,
          helperKo: `하락폭 ${(Number(topBarLiveMarginSource.marginDropRate || 0) * 100).toFixed(1)}%p / 예상 잔여원가 ${Number(topBarLiveMarginSource.estimatedRemainingCost || 0).toLocaleString('ko-KR')}원`,
          severity: topBarLiveMarginSource.alertLevel,
          action: 'openCostCapture'
        }
      : { id: 'liveMarginRate', labelKo: '현재 예상 마진율', value: '0.0%', helperKo: '진행 중 프로젝트 없음', severity: 'GREEN', action: 'openCostCapture' };

    return [
      { id: 'todayRevenueExpected', labelKo: '오늘 입금 예정', value: '38,500,000원', helperKo: '중도금 2건 + 잔금 1건', severity: 'YELLOW', action: 'openCashflow' },
      { id: 'todayExpenseExpected', labelKo: '오늘 지급 예정', value: '21,800,000원', helperKo: '자재 발주 + 외주 정산', severity: 'YELLOW', action: 'openExpenseSchedule' },
      { id: 'todayNetCashflow', labelKo: '순현금흐름', value: '+16,700,000원', helperKo: '입금 승인 지연 시 음수 전환', severity: 'RED', action: 'openCashflow' },
      { id: 'receivableAmount', labelKo: '미수금', value: '12,400,000원', helperKo: '주방 현장 1건 미수', severity: 'RED', action: 'openCashflow' },
      { id: 'claimableFinalPayment', labelKo: '잔금 청구 가능', value: '18,000,000원', helperKo: '검수 조건 확인 필요', severity: 'RED', action: 'openApprovalCenter' },
      { id: 'estimatedLossAmount', labelKo: '예상 손실', value: '4,600,000원', helperKo: '방수 재시공 + 발주 지연', severity: 'RED', action: 'openBlockingAlerts' },
      captureKpi,
      liveMarginKpi,
      marginKpi,
      profitEngineKpi,
      vendorKpi,
      automationKpi,
      portfolioKpi,
      crewKpi,
      financeKpi,
      salesKpi
    ];
  }

  function buildRedAlerts() {
    const costStatus = db.project.prepare('SELECT * FROM cost_capture_status WHERE missing_critical_count > 0 ORDER BY missing_critical_count DESC LIMIT 1').get();
    const alerts = [
      { alertId: 'RED-001', projectId: 'PRJ-APT-2401', titleKo: '방수 검수 실패', reasonKo: '검수 실패 상태에서 벽 타일 공정이 시작 예정입니다.', severity: 'BLOCKING', firstAction: 'blockTileProcess', drillDownTarget: 'ontology' },
      { alertId: 'RED-002', projectId: 'PRJ-APT-2401', titleKo: '공정 차단 필요', reasonKo: '방수 재검수 전까지 타일, 줄눈, 실리콘 후속 공정을 멈춰야 합니다.', severity: 'BLOCKING', firstAction: 'blockTileProcess', drillDownTarget: 'risks' },
      { alertId: 'RED-003', projectId: 'PRJ-BATH-0501', titleKo: '발주 지연', reasonKo: '타일 입고 예정일이 공정 시작일보다 늦을 수 있습니다.', severity: 'HIGH', firstAction: 'approveRushOrder', drillDownTarget: 'ontology' },
      { alertId: 'RED-004', projectId: 'PRJ-APT-2401', titleKo: '잔금 청구 불가', reasonKo: '검수 조건 미충족 상태에서는 잔금 청구를 승인할 수 없습니다.', severity: 'BLOCKING', firstAction: 'holdPaymentClaim', drillDownTarget: 'project' },
      { alertId: 'RED-005', projectId: 'GLOBAL', titleKo: 'Master DB 승인 대기', reasonKo: '타일공 최소 품수 기준 보정 후보가 대표 승인 대기 중입니다.', severity: 'BLOCKING', firstAction: 'openApprovalCenter', drillDownTarget: 'masterDb' }
    ];
    if (costStatus) {
      alerts.unshift({
        alertId: `RED-COST-${costStatus.project_id}`,
        projectId: costStatus.project_id,
        titleKo: '실제 원가 누락',
        reasonKo: `핵심 원가 ${costStatus.missing_critical_count}건이 미입력 상태입니다. Completion 전환이 차단됩니다.`,
        severity: 'BLOCKING',
        firstAction: 'openCostCapture',
        drillDownTarget: 'costCapture'
      });
      const currentLiveMargin = getLatestLiveMarginSnapshot(costStatus.project_id) || buildLiveMarginSnapshot(costStatus.project_id, costStatus.revenue, costStatus.captured_cost, costStatus.updated_at);
      if (currentLiveMargin.alertLevel === 'RED') {
        alerts.unshift({
          alertId: `RED-LIVE-MARGIN-CURRENT-${costStatus.project_id}`,
          projectId: costStatus.project_id,
          titleKo: '실시간 마진 붕괴 위험',
          reasonKo: `현재 예상 마진율 ${(Number(currentLiveMargin.currentForecastMarginRate || 0) * 100).toFixed(2)}%, 최초 대비 하락폭 ${(Number(currentLiveMargin.marginDropRate || 0) * 100).toFixed(1)}%p입니다.`,
          severity: 'BLOCKING',
          firstAction: 'openCostCapture',
          drillDownTarget: 'costCapture'
        });
      }
    }
    const liveMarginRed = db.project.prepare(`
      SELECT *
      FROM live_margin_snapshots
      WHERE alert_level = 'RED'
      ORDER BY created_at DESC
      LIMIT 1
    `).get();
    if (liveMarginRed) {
      alerts.unshift({
        alertId: `RED-LIVE-MARGIN-${liveMarginRed.snapshot_id}`,
        projectId: liveMarginRed.project_id,
        titleKo: '실시간 마진 붕괴 위험',
        reasonKo: `현재 예상 마진율 ${(Number(liveMarginRed.current_forecast_margin_rate || 0) * 100).toFixed(2)}%, 최초 대비 하락폭 ${(Number(liveMarginRed.margin_drop_rate || 0) * 100).toFixed(1)}%p입니다. Completion 승인 전 원가 누수를 확인해야 합니다.`,
        severity: 'BLOCKING',
        firstAction: 'openCostCapture',
        drillDownTarget: 'costCapture'
      });
    }
    const processLeakRed = db.project.prepare(`
      SELECT *
      FROM process_cost_leaks
      WHERE severity = 'RED'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    if (processLeakRed) {
      alerts.unshift({
        alertId: `RED-PROCESS-LEAK-${processLeakRed.leak_id}`,
        projectId: processLeakRed.project_id,
        titleKo: '공정별 Cost Leak',
        reasonKo: processLeakRed.alert_message_ko,
        severity: 'BLOCKING',
        firstAction: 'openCostCapture',
        drillDownTarget: 'costCapture'
      });
    }
    const blockedMargin = db.project.prepare(`
      SELECT *
      FROM estimate_drafts
      WHERE margin_safety_status = 'BLOCKED'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    if (blockedMargin) {
      alerts.unshift({
        alertId: `RED-MARGIN-${blockedMargin.estimate_draft_id}`,
        projectId: blockedMargin.project_id,
        titleKo: '저마진 견적 자동 차단',
        reasonKo: `예상 마진율 ${(Number(blockedMargin.estimated_margin_rate || 0) * 100).toFixed(2)}%로 FINAL_ESTIMATE 승인 불가 상태입니다.`,
        severity: 'BLOCKING',
        firstAction: 'openMarginSafety',
        drillDownTarget: 'marginSafety'
      });
    }
    const pceBlocked = db.project.prepare(`
      SELECT *
      FROM profit_decisions
      WHERE decision = 'BLOCK'
      ORDER BY created_at DESC
      LIMIT 3
    `).all();
    pceBlocked.forEach((decision) => {
      alerts.unshift({
        alertId: `RED-PCE-${decision.id}`,
        projectId: decision.estimate_id,
        titleKo: 'PCE 저마진 프로젝트 자동 차단',
        reasonKo: `실질 마진율 ${(Number(decision.real_margin || 0) * 100).toFixed(2)}%로 25% 기준 미달입니다. 프로젝트 생성이 차단되었습니다.`,
        severity: 'BLOCKING',
        firstAction: 'openSales',
        drillDownTarget: 'sales'
      });
    });
    getActiveAutomationEvents(10)
      .filter((event) => event.severity === 'RED' || event.severity === 'BLOCKING' || event.blocking_required)
      .forEach((event) => {
        alerts.unshift({
          alertId: event.trigger_id,
          projectId: event.project_id,
          titleKo: event.title_ko,
          reasonKo: event.message_ko,
          severity: event.blocking_required ? 'BLOCKING' : 'HIGH',
          firstAction: event.next_action_ko,
          drillDownTarget: event.event_category === 'Cost' ? 'costCapture' : event.event_category === 'Site' ? 'risks' : event.event_category === 'Sales' ? 'sales' : 'project'
        });
      });
    return alerts;
  }

  function buildImmediateActions() {
    const automationActions = getActiveAutomationEvents(8).map((event, index) => ({
      actionId: `AUTO-${event.trigger_id}`,
      priority: index,
      titleKo: event.title_ko,
      reasonKo: event.message_ko,
      buttonLabelKo: event.blocking_required ? '차단' : event.event_category === 'Procurement' ? '발주' : event.event_category === 'Payment' ? '청구' : '확인',
      targetView: event.event_category === 'Cost' ? 'costCapture' : event.event_category === 'Site' ? 'risks' : event.event_category === 'Sales' ? 'sales' : 'project'
    }));
    return [
      ...automationActions,
      { actionId: 'ACT-COST-001', priority: 0, titleKo: '실제 원가 누락 입력', reasonKo: 'Completion 전 철거/폐기물/타일/인건비/운반비를 확보해야 합니다.', buttonLabelKo: '차단', targetView: 'costCapture' },
      { actionId: 'ACT-001', priority: 1, titleKo: '타일 후속 공정 차단', reasonKo: '방수 검수 실패', buttonLabelKo: '차단', targetView: 'risks' },
      { actionId: 'ACT-002', priority: 2, titleKo: '대체 타일 긴급 발주', reasonKo: '발주 리드타임 부족', buttonLabelKo: '발주', targetView: 'approvals' },
      { actionId: 'ACT-003', priority: 3, titleKo: '잔금 청구 보류', reasonKo: '검수 조건 미충족', buttonLabelKo: '청구', targetView: 'project' }
    ];
  }

  function decideApproval({ approvalId, decision, actor = 'CEO', reasonKo = '' }) {
    const approvalPreview = db.approval.prepare('SELECT * FROM approvals WHERE approval_id = ?').get(approvalId);
    const permissionKey = approvalPreview?.approval_type === 'MasterDbUpdateRequest'
      ? 'MASTER_DB_APPROVE'
      : approvalPreview?.approval_type === 'EstimateApproval'
        ? 'FINAL_ESTIMATE_APPROVE'
        : 'FINAL_ESTIMATE_APPROVE';
    requirePermission({ actor, permissionKey, actionType: `APPROVAL_${decision}`, payload: { approvalId, projectId: approvalPreview?.project_id } });
    const approval = db.approval.prepare('SELECT * FROM approvals WHERE approval_id = ?').get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (approval.approval_type === 'MasterDbUpdateRequest' && decision === 'APPROVED') {
      const request = db.master.prepare('SELECT * FROM master_db_update_requests WHERE request_id = ?').get('MDB-REQ-001');
      if (!request || request.approval_status !== 'PENDING_CEO_APPROVAL') {
        throw new Error('Master DB update request is not pending approval.');
      }

      if (!request.rollback_data_json || request.rollback_data_json === 'null') {
        throw new Error('Master DB update blocked: rollbackData is required.');
      }
    }

    const createdAt = nowIso();
    let effectiveDecision = decision;
    let effectiveReasonKo = reasonKo || decisionToKorean(decision);
    let estimateApprovalResult = null;
    let learningApprovalResult = null;

    if (approval.approval_type === 'EstimateApproval') {
      estimateApprovalResult = handleEstimateApprovalDecision({ approval, decision, actor, reasonKo, createdAt });
      effectiveDecision = estimateApprovalResult.effectiveDecision;
      effectiveReasonKo = estimateApprovalResult.effectiveReasonKo;
    }

    if (approval.approval_type === 'ChangeOrder') {
      const changeOrderResult = handleChangeOrderApprovalDecision({ approval, decision, actor, reasonKo, createdAt });
      effectiveDecision = changeOrderResult.effectiveDecision;
      effectiveReasonKo = changeOrderResult.effectiveReasonKo;
    }

    if (approval.approval_type === 'LearningSuggestion') {
      learningApprovalResult = handleLearningSuggestionApprovalDecision({ approval, decision, actor, reasonKo, createdAt });
      effectiveDecision = learningApprovalResult.effectiveDecision;
      effectiveReasonKo = learningApprovalResult.effectiveReasonKo;
    }

    const afterStatus = effectiveDecision === 'APPROVED' ? 'APPROVED' : effectiveDecision === 'REJECTED' ? 'REJECTED' : 'REVISION_REQUESTED';

    db.approval.prepare(`
      UPDATE approvals
      SET status = ?, decided_by = ?, decided_at = ?, decision_reason_ko = ?, updated_at = ?
      WHERE approval_id = ?
    `).run(afterStatus, actor, createdAt, effectiveReasonKo, createdAt, approvalId);

    db.approval.prepare(`
      INSERT INTO approval_actions (
        action_id, approval_id, action_type, actor, reason_ko,
        before_status, after_status, rollback_required, rollback_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`APPACT-${Date.now()}`, approvalId, effectiveDecision, actor, effectiveReasonKo, approval.status, afterStatus, approval.rollback_required, approval.rollback_status, createdAt);

    if (approval.approval_type === 'MasterDbUpdateRequest' && effectiveDecision === 'APPROVED') {
      approveMasterDbRequest({ requestId: 'MDB-REQ-001', approvalId, actor, createdAt });
    }

    recordAction({
      actionType: effectiveDecision,
      actor,
      projectId: approval.project_id,
      approvalId,
      reasonKo: effectiveReasonKo,
      payload: {
        approvalId,
        beforeStatus: approval.status,
        afterStatus,
        finalEstimate: estimateApprovalResult?.finalPayload || null,
        learningApproval: learningApprovalResult
      }
    });

    return getDashboardData();
  }

  function approveMasterDbRequest({ requestId, approvalId, actor, createdAt }) {
    const request = db.master.prepare('SELECT * FROM master_db_update_requests WHERE request_id = ?').get(requestId);
    if (!request) throw new Error(`Master DB request not found: ${requestId}`);

    db.master.prepare(`
      INSERT OR REPLACE INTO master_db_values (
        item_id, target_db, value_json, version, updated_by, updated_at, approval_id
      ) VALUES (?, ?, ?, COALESCE((SELECT version + 1 FROM master_db_values WHERE item_id = ?), 1), ?, ?, ?)
    `).run(request.target_item_id, request.target_db, request.proposed_value_json, request.target_item_id, actor, createdAt, approvalId);

    db.master.prepare(`
      INSERT INTO master_db_rollback_snapshots (
        snapshot_id, request_id, target_item_id, before_value_json, after_value_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(`ROLLBACK-${Date.now()}`, requestId, request.target_item_id, request.current_value_json, request.proposed_value_json, createdAt);

    db.master.prepare(`
      UPDATE master_db_update_requests
      SET approval_status = 'APPROVED', approved_by = ?, approved_at = ?, applied_at = ?
      WHERE request_id = ?
    `).run(actor, createdAt, createdAt, requestId);
  }

  function recordAction({ actionType, actor = 'CEO', projectId = 'GLOBAL', approvalId = null, payload = {}, reasonKo = '' }) {
    const createdAt = nowIso();
    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`ACTLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`, actionType, actor, projectId, approvalId, toJson(payload), reasonKo, createdAt);

    db.logs.prepare(`
      INSERT INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`, new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }), logLevelForAction(actionType), notificationMessageForAction(actionType, reasonKo), projectId, actionToKorean(actionType), createdAt);

    return getDashboardData();
  }

  function decisionToKorean(decision) {
    if (decision === 'APPROVED') return '대표 승인';
    if (decision === 'REJECTED') return '대표 반려';
    return '대표 수정 요청';
  }

  function actionToKorean(actionType) {
    if (actionType === 'APPROVED') return '승인';
    if (actionType === 'REJECTED') return '반려';
    if (actionType === 'REVISION_REQUESTED') return '수정 요청';
    if (actionType === 'BLOCK') return '차단';
    if (actionType === 'ORDER') return '발주';
    if (actionType === 'CLAIM') return '청구';
    if (actionType === 'CAPTURE_ACTUAL_COST') return '실제 원가 입력';
    return '기록';
  }

  function logLevelForAction(actionType) {
    if (actionType === 'BLOCK' || actionType === 'REJECTED') return 'RED';
    if (actionType === 'ORDER' || actionType === 'CLAIM' || actionType === 'REVISION_REQUESTED') return 'WARNING';
    return 'INFO';
  }

  function notificationMessageForAction(actionType, reasonKo) {
    const label = actionToKorean(actionType);
    return reasonKo ? `${label}: ${reasonKo}` : `${label} 액션 기록`;
  }

  function getDbStats() {
    return {
      databaseDir,
      dbPaths,
      projectCount: countRows(db.project, 'projects'),
      approvalCount: countRows(db.approval, 'approvals'),
      masterRequestCount: countRows(db.master, 'master_db_update_requests'),
      bathroomPricingStandardCount: countRows(db.master, 'bathroom_pricing_standards'),
      bathroomPricingOptionCount: countRows(db.master, 'bathroom_pricing_options'),
      marginSafetyRuleCount: countRows(db.master, 'margin_safety_rules'),
      notificationCount: countRows(db.logs, 'notification_logs'),
      actionLogCount: countRows(db.logs, 'action_logs'),
      scheduledJobCount: countRows(db.logs, 'scheduled_jobs'),
      jobExecutionLogCount: countRows(db.logs, 'job_execution_logs'),
      eventTriggerCount: countRows(db.logs, 'event_triggers'),
      userCount: countRows(db.logs, 'users'),
      roleCount: countRows(db.logs, 'roles'),
      permissionCount: countRows(db.logs, 'permissions'),
      userPermissionLogCount: countRows(db.logs, 'user_permission_logs'),
      estimateDraftCount: countRows(db.project, 'estimate_drafts'),
      bathroomEstimateCount: countRows(db.project, 'bathroom_estimates'),
      bathroomEstimateItemCount: countRows(db.project, 'bathroom_estimate_items'),
      portfolioProjectCount: countRows(db.project, 'portfolio_projects'),
      resourceAllocationCount: countRows(db.project, 'resource_allocations'),
      resourceConflictCount: countRows(db.project, 'resource_conflicts'),
      portfolioCashflowCount: countRows(db.project, 'portfolio_cashflow'),
      crewMemberCount: countRows(db.project, 'crew_members'),
      crewSkillCount: countRows(db.project, 'crew_skills'),
      crewAllocationCount: countRows(db.project, 'crew_allocations'),
      crewAttendanceCount: countRows(db.project, 'crew_attendance'),
      crewPerformanceCount: countRows(db.project, 'crew_performance'),
      laborCostRecordCount: countRows(db.project, 'labor_cost_records'),
      crewRiskLogCount: countRows(db.project, 'crew_risk_logs'),
      companyFixedCostCount: countRows(db.project, 'company_fixed_costs'),
      monthlyProfitLossCount: countRows(db.project, 'monthly_profit_loss'),
      companyCashflowForecastCount: countRows(db.project, 'company_cashflow_forecast'),
      receivableCount: countRows(db.project, 'receivables'),
      payableCount: countRows(db.project, 'payables'),
      leadCount: countRows(db.project, 'leads'),
      leadActivityCount: countRows(db.project, 'lead_activities'),
      leadEstimateLinkCount: countRows(db.project, 'lead_estimate_links'),
      salesPipelineMetricCount: countRows(db.project, 'sales_pipeline_metrics'),
      lostReasonLogCount: countRows(db.project, 'lost_reason_logs'),
      qualificationResultCount: countRows(db.project, 'qualification_results'),
      profitDecisionCount: countRows(db.project, 'profit_decisions'),
      profitTemplateCount: countRows(db.project, 'profit_templates'),
      templateMatchCount: countRows(db.project, 'template_matches'),
      decisionOverrideCount: countRows(db.project, 'decision_overrides'),
      profitAutomationEventCount: countRows(db.project, 'profit_automation_events'),
      liveMarginEventCount: countRows(db.project, 'live_margin_events'),
      autoBlockRuleCount: countRows(db.project, 'auto_block_rules'),
      profitTemplateRecommendationCount: countRows(db.project, 'profit_template_recommendations'),
      clientCount: countRows(db.project, 'clients'),
      contractCount: countRows(db.project, 'contracts'),
      contractDocumentCount: countRows(db.project, 'contract_documents'),
      contractApprovalLogCount: countRows(db.project, 'contract_approval_logs'),
      clientDocumentLogCount: countRows(db.project, 'client_document_logs'),
      estimateDraftInputCount: countRows(db.project, 'estimate_draft_inputs'),
      estimateDraftProcessCount: countRows(db.project, 'estimate_draft_processes'),
      estimateDraftConfirmationCount: countRows(db.project, 'estimate_draft_confirmations'),
      estimateDraftDocumentCount: countRows(db.project, 'estimate_draft_documents'),
      estimateDraftWarningCount: countRows(db.project, 'estimate_draft_warnings'),
      estimateDraftChangeLogCount: countRows(db.project, 'estimate_draft_change_logs'),
      estimateApprovalLogCount: countRows(db.project, 'estimate_approval_logs'),
      finalEstimateCount: countRows(db.project, 'final_estimates'),
      finalEstimateDocumentCount: countRows(db.project, 'final_estimate_documents'),
      changeOrderApprovalLogCount: countRows(db.project, 'change_order_approval_logs'),
      changeOrderCostImpactCount: countRows(db.project, 'change_order_cost_impacts'),
      changeOrderScheduleImpactCount: countRows(db.project, 'change_order_schedule_impacts'),
      changeOrderPaymentImpactCount: countRows(db.project, 'change_order_payment_impacts'),
      executionProjectCount: countRows(db.project, 'execution_projects'),
      executionDocumentCount: countRows(db.project, 'execution_documents'),
      purchaseOrderCount: countRows(db.project, 'purchase_orders'),
      paymentMilestoneCount: countRows(db.project, 'payment_milestones'),
      siteReportTemplateCount: countRows(db.project, 'site_report_templates'),
      inspectionChecklistCount: countRows(db.project, 'inspection_checklists'),
      executionLogCount: countRows(db.project, 'execution_logs'),
      siteOperationCount: countRows(db.project, 'site_operations'),
      dailySiteReportCount: countRows(db.project, 'daily_site_reports'),
      materialDeliveryCheckCount: countRows(db.project, 'material_delivery_checks'),
      inspectionResultCount: countRows(db.project, 'inspection_results'),
      siteIssueCount: countRows(db.project, 'site_issues'),
      changeOrderRequestCount: countRows(db.project, 'change_order_requests'),
      siteRiskLogCount: countRows(db.project, 'site_risk_logs'),
      projectCompletionReportCount: countRows(db.project, 'project_completion_reports'),
      actualCostCount: countRows(db.project, 'actual_costs'),
      costCaptureRequirementCount: countRows(db.project, 'cost_capture_requirements'),
      costCaptureEntryCount: countRows(db.project, 'cost_capture_entries'),
      costCaptureStatusCount: countRows(db.project, 'cost_capture_status'),
      costLeakAnalysisCount: countRows(db.project, 'cost_leak_analysis'),
      actualDurationCount: countRows(db.project, 'actual_durations'),
      finalMarginReportCount: countRows(db.project, 'final_margin_reports'),
      estimateVsActualReportCount: countRows(db.project, 'estimate_vs_actual_reports'),
      masterDbUpdateCandidateCount: countRows(db.project, 'master_db_update_candidates'),
      caseLibraryCount: countRows(db.project, 'case_library'),
      defectPatternCount: countRows(db.project, 'defect_patterns'),
      profitPatternCount: countRows(db.project, 'profit_patterns'),
      learningSuggestionCount: countRows(db.project, 'learning_suggestions'),
      autoUpdateCandidateCount: countRows(db.project, 'auto_update_candidates'),
      learningApprovalLogCount: countRows(db.project, 'learning_approval_logs'),
      learningUpdateSnapshotCount: countRows(db.project, 'learning_update_snapshots'),
      projectInputCount: countRows(db.project, 'project_inputs'),
      generatedProcessCount: countRows(db.project, 'generated_processes'),
      needsConfirmationCount: countRows(db.project, 'needs_confirmations'),
      paymentPlanCount: countRows(db.project, 'payment_plans'),
      purchaseRequirementCount: countRows(db.project, 'purchase_requirements'),
      scheduleDraftCount: countRows(db.project, 'schedule_drafts'),
      vendorPriceCatalogCount: countRows(db.master, 'vendor_price_catalog'),
      vendorPriceApprovalLogCount: countRows(db.master, 'vendor_price_approval_logs'),
      vendorPriceEvidenceCount: countRows(db.master, 'vendor_price_evidence'),
      vendorPriceRollbackSnapshotCount: countRows(db.master, 'vendor_price_rollback_snapshots')
    };
  }

  migrate();
  seedIfEmpty();

  return {
    getDashboardData,
    decideApproval,
    recordAction,
    saveEstimateDraft,
    loadEstimateDraftForProject,
    updateEstimateDraft,
    calculateBathroomEstimatePreview,
    saveBathroomEstimate,
    getProjectExecutionReadiness,
    transitionProjectToExecution,
    getSiteOperationStatus,
    startSiteOperation,
    saveDailySiteReport,
    saveMaterialDeliveryCheck,
    saveInspectionResult,
    createSiteIssue,
    createChangeOrderRequest,
    getProjectCompletionReadiness,
    completeProject,
    getActualCostCaptureDashboard,
    saveActualCostEntry,
    evaluateCostCaptureReadiness,
    getVendorPriceAdminData,
    createVendorPriceCatalogEntry,
    decideVendorPriceApproval,
    runAutomationScheduler,
    getPermissionAdminData,
    assertUserPermission,
    getPortfolioDashboardData,
    getCrewDashboardData,
    getCompanyFinanceDashboardData,
    getSalesPipelineData,
    createLead,
    updateLeadStatus,
    linkLeadToEstimate,
    getProfitGenerationData,
    runProfitControlEngine,
    overrideProfitDecision,
    getClientContractData,
    approveContract,
    getBathroomPricingStandardDashboard,
    evaluateBathroomQuote,
    getCaseLibrarySnapshot,
    runCaseLearningAnalysis,
    getDbStats,
    dbPaths
  };
}

module.exports = {
  createSqliteService
};
