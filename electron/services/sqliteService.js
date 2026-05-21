const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  calculateBathroomEstimate,
  buildCustomerEstimateView,
  buildInternalCostView
} = require('./bathroomEstimateService');
const {
  calculateKitchenEstimate,
  buildCustomerKitchenEstimateView,
  buildInternalKitchenCostView,
  buildKitchenScheduleFromEstimate,
  buildKitchenPurchaseOrderFromEstimate
} = require('./kitchenEstimateService');
const {
  calculateFullRemodelingEstimate,
  buildCustomerFullEstimateView,
  buildInternalFullCostView,
  buildFullScheduleFromEstimate,
  buildFullPurchaseOrderFromEstimate
} = require('./fullRemodelingEstimateService');
const {
  validateLightBIMJSON,
  parseLightBIMJSON,
  createEstimateDraftFromLightBIM
} = require('./lightBimImportService');
const { exportEstimateDocument } = require('./estimateExportService');
const { buildContractFromEstimate, exportContractPdf } = require('./contractService');
const { buildScheduleFromEstimate } = require('./scheduleService');
const { buildPurchaseOrderFromEstimate } = require('./purchaseOrderService');
const { buildDailySiteReport } = require('./dailyReportService');
const { buildAttendanceRows } = require('./attendanceService');
const { buildReceivingRows } = require('./materialReceivingService');
const { buildBathroomInspectionChecklist, evaluateInspectionItems } = require('./inspectionService');
const { buildChangeOrderPayload } = require('./changeOrderService');
const { buildDefectPayload } = require('./defectService');
const { buildCommunicationMessage, defaultCommunicationTemplates } = require('./communicationService');
const { buildEstimateIntelligence } = require('./aiEstimateIntelligenceService');
const { buildVisualizationPromptSet, pickPromptByType, injectPromptIntoWorkflow } = require('./visualizationService');
const { BOARD_TEMPLATES, buildBoardLayout, exportBoardPdf, shouldRecommendPortfolioCandidate } = require('./boardGenerationService');
const {
  COST_LEAK_LABELS_KO,
  compareExpectedActual,
  buildProjectCostLeak,
  buildCalibrationRule,
  buildRiskPattern
} = require('./projectCalibrationService');
const {
  calculateVarianceRate,
  resolvePriceRiskLevel,
  calculateVendorReliabilityScore,
  compareVendorPrices,
  buildPriceAlert,
  buildEstimatePriceRecommendation,
  recommendVendor,
  parseVendorPriceCsv
} = require('./vendorPriceIntelligenceService');
const {
  normalizeActive,
  toInteger: masterToInteger,
  validateMasterDataSets,
  parseMasterCsv,
  buildCsv
} = require('./masterDataService');
const {
  calculateBranchMetrics,
  calculateFranchiseFee,
  shouldCreateBranchRiskAlert
} = require('./franchiseService');
const { requestManualGeneration } = require('./visualizationProviders/manualProvider');
const { healthCheck: comfyUiHealthCheck, queuePrompt: queueComfyUiPrompt, downloadImages: downloadComfyUiImages } = require('./visualizationProviders/comfyuiProvider');
const { requestExternalApiGeneration } = require('./visualizationProviders/externalApiProvider');

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
  const estimateExportDir = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'export', 'estimates')
    : path.join(__dirname, '..', '..', 'export', 'estimates');
  const contractExportDir = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'export', 'contracts')
    : path.join(__dirname, '..', '..', 'export', 'contracts');
  const visualizationExportDir = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'export', 'visualizations')
    : path.join(__dirname, '..', '..', 'export', 'visualizations');
  const boardExportDir = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'export', 'boards')
    : path.join(__dirname, '..', '..', 'export', 'boards');
  const scheduleExportDir = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'export', 'schedules')
    : path.join(__dirname, '..', '..', 'export', 'schedules');
  const purchaseOrderExportDir = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'export', 'purchase-orders')
    : path.join(__dirname, '..', '..', 'export', 'purchase-orders');
  const reportExportDir = app && app.isPackaged
    ? path.join(app.getPath('userData'), 'export', 'reports')
    : path.join(__dirname, '..', '..', 'export', 'reports');

  [
    estimateExportDir,
    contractExportDir,
    scheduleExportDir,
    purchaseOrderExportDir,
    visualizationExportDir,
    boardExportDir,
    reportExportDir
  ].forEach((exportDir) => fs.mkdirSync(exportDir, { recursive: true }));

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

      CREATE TABLE IF NOT EXISTS lightbim_imports (
        id TEXT PRIMARY KEY,
        source_file_name TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        project_name TEXT NOT NULL,
        detected_estimate_type TEXT NOT NULL,
        total_area_m2 REAL NOT NULL,
        space_count INTEGER NOT NULL,
        raw_json TEXT NOT NULL,
        normalized_summary_json TEXT NOT NULL,
        created_estimate_type TEXT,
        created_estimate_id TEXT,
        status TEXT NOT NULL,
        error_message TEXT,
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

      CREATE TABLE IF NOT EXISTS kitchen_estimates (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        site_name TEXT NOT NULL,
        kitchen_type TEXT NOT NULL,
        kitchen_length_mm INTEGER NOT NULL,
        ceiling_height_mm INTEGER NOT NULL,
        demolition_included INTEGER NOT NULL,
        expansion_included INTEGER NOT NULL,
        upper_cabinet_length_mm INTEGER NOT NULL,
        lower_cabinet_length_mm INTEGER NOT NULL,
        tall_cabinet INTEGER NOT NULL,
        pantry INTEGER NOT NULL,
        island INTEGER NOT NULL,
        door_finish TEXT NOT NULL,
        countertop_type TEXT NOT NULL,
        handle_type TEXT NOT NULL,
        options_json TEXT NOT NULL,
        revenue INTEGER NOT NULL,
        total_cost INTEGER NOT NULL,
        expected_margin INTEGER NOT NULL,
        expected_margin_rate REAL NOT NULL,
        pce_decision TEXT NOT NULL,
        schedule_days INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kitchen_estimate_items (
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

      CREATE TABLE IF NOT EXISTS full_remodeling_estimates (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        site_name TEXT NOT NULL,
        housing_type TEXT NOT NULL,
        area_m2 REAL NOT NULL,
        area_pyeong REAL NOT NULL,
        room_count INTEGER NOT NULL,
        bathroom_count INTEGER NOT NULL,
        kitchen_type TEXT NOT NULL,
        balcony_count INTEGER NOT NULL,
        construction_scope TEXT NOT NULL,
        selected_processes_json TEXT NOT NULL,
        process_options_json TEXT NOT NULL,
        demolition_json TEXT NOT NULL,
        revenue INTEGER NOT NULL,
        total_cost INTEGER NOT NULL,
        expected_margin INTEGER NOT NULL,
        expected_margin_rate REAL NOT NULL,
        pce_decision TEXT NOT NULL,
        schedule_days INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS full_remodeling_estimate_items (
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

      CREATE TABLE IF NOT EXISTS floorplans (
        id TEXT PRIMARY KEY,
        estimate_id TEXT,
        project_id TEXT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS floorplan_spaces (
        id TEXT PRIMARY KEY,
        floorplan_id TEXT NOT NULL,
        space_name TEXT NOT NULL,
        space_type TEXT NOT NULL,
        area_m2 REAL NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS space_estimate_links (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        estimate_type TEXT NOT NULL,
        estimate_id TEXT NOT NULL,
        estimate_item_id TEXT,
        item_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        cost INTEGER NOT NULL,
        margin INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS design_prompt_outputs (
        id TEXT PRIMARY KEY,
        floorplan_id TEXT,
        space_id TEXT,
        estimate_id TEXT,
        prompt_type TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        source_payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS moodboard_profiles (
        id TEXT PRIMARY KEY,
        estimate_id TEXT,
        floorplan_id TEXT,
        style TEXT NOT NULL,
        color_tone TEXT NOT NULL,
        primary_materials TEXT NOT NULL,
        lighting_mood TEXT NOT NULL,
        reference_notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS visualization_briefs (
        id TEXT PRIMARY KEY,
        estimate_type TEXT NOT NULL,
        estimate_id TEXT,
        floorplan_id TEXT,
        space_id TEXT,
        project_name TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        space_name TEXT NOT NULL,
        space_type TEXT NOT NULL,
        area_m2 REAL NOT NULL,
        style TEXT NOT NULL,
        color_tone TEXT NOT NULL,
        material_keywords TEXT NOT NULL,
        lighting_mood TEXT NOT NULL,
        design_notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS visualization_jobs (
        id TEXT PRIMARY KEY,
        brief_id TEXT NOT NULL,
        prompt_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        negative_prompt TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS visualization_results (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        brief_id TEXT NOT NULL,
        image_path TEXT NOT NULL,
        thumbnail_path TEXT,
        result_type TEXT NOT NULL,
        status TEXT NOT NULL,
        review_note TEXT NOT NULL,
        approved_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comfyui_settings (
        id TEXT PRIMARY KEY,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        base_url TEXT NOT NULL,
        default_workflow_id TEXT,
        is_enabled INTEGER NOT NULL,
        last_health_status TEXT NOT NULL,
        last_checked_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comfyui_workflow_presets (
        id TEXT PRIMARY KEY,
        preset_name TEXT NOT NULL,
        preset_type TEXT NOT NULL,
        workflow_json TEXT NOT NULL,
        positive_prompt_node_id TEXT NOT NULL,
        negative_prompt_node_id TEXT NOT NULL,
        seed_node_id TEXT,
        width_node_id TEXT,
        height_node_id TEXT,
        output_node_id TEXT,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comfyui_job_logs (
        id TEXT PRIMARY KEY,
        visualization_job_id TEXT NOT NULL,
        provider_job_id TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS design_board_templates (
        id TEXT PRIMARY KEY,
        template_name TEXT NOT NULL,
        typography_json TEXT NOT NULL,
        spacing_json TEXT NOT NULL,
        grid_style TEXT NOT NULL,
        image_ratio TEXT NOT NULL,
        section_ordering_json TEXT NOT NULL,
        background_style TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS design_boards (
        id TEXT PRIMARY KEY,
        board_type TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        project_id TEXT,
        estimate_id TEXT,
        project_name TEXT NOT NULL,
        template_id TEXT NOT NULL,
        board_layout_json TEXT NOT NULL,
        export_path TEXT,
        status TEXT NOT NULL,
        print_format TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS design_board_sections (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        section_type TEXT NOT NULL,
        section_title TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        content_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS portfolio_candidates (
        id TEXT PRIMARY KEY,
        board_id TEXT,
        project_id TEXT,
        featured_project TEXT NOT NULL,
        featured_space TEXT NOT NULL,
        featured_image TEXT NOT NULL,
        final_margin_rate REAL NOT NULL,
        completion_quality TEXT NOT NULL,
        client_claims TEXT NOT NULL,
        defect_status TEXT NOT NULL,
        recommendation_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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

      CREATE TABLE IF NOT EXISTS client_portal_tokens (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_confirmations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        confirmation_type TEXT NOT NULL,
        client_name TEXT NOT NULL,
        status TEXT NOT NULL,
        note TEXT NOT NULL,
        signed_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_change_order_responses (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        change_order_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        response_status TEXT NOT NULL,
        question TEXT NOT NULL,
        responded_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_defect_requests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        defect_location_ko TEXT NOT NULL,
        defect_content_ko TEXT NOT NULL,
        photo_path TEXT NOT NULL,
        urgent INTEGER NOT NULL,
        contact_time_ko TEXT NOT NULL,
        request_status TEXT NOT NULL,
        related_defect_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_snapshots (
        id TEXT PRIMARY KEY,
        snapshot_date TEXT NOT NULL,
        total_revenue INTEGER NOT NULL,
        total_cost INTEGER NOT NULL,
        total_margin INTEGER NOT NULL,
        average_margin_rate REAL NOT NULL,
        kpi_payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_predictions (
        id TEXT PRIMARY KEY,
        prediction_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        recommendation_ko TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_export_logs (
        id TEXT PRIMARY KEY,
        export_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_agents (
        id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        agent_type TEXT NOT NULL UNIQUE,
        is_enabled INTEGER NOT NULL,
        risk_threshold REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_task_queue (
        id TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        task_type TEXT NOT NULL,
        priority TEXT NOT NULL,
        related_entity_type TEXT NOT NULL,
        related_entity_id TEXT NOT NULL,
        detected_risk TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        draft_payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        requires_human_approval INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        executed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS ai_learning_logs (
        id TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        event_type TEXT NOT NULL,
        input_summary TEXT NOT NULL,
        detected_pattern TEXT NOT NULL,
        generated_action TEXT NOT NULL,
        final_result TEXT NOT NULL,
        success_score REAL NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_prevention_rules (
        id TEXT PRIMARY KEY,
        rule_name TEXT NOT NULL,
        trigger_pattern TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        severity TEXT NOT NULL,
        source_agent TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS communication_templates (
        id TEXT PRIMARY KEY,
        template_type TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        body_template TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS communication_messages (
        id TEXT PRIMARY KEY,
        message_type TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_name TEXT NOT NULL,
        target_contact TEXT NOT NULL,
        related_entity_type TEXT NOT NULL,
        related_entity_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sent_at TEXT
      );

      CREATE TABLE IF NOT EXISTS communication_send_logs (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        result_message TEXT NOT NULL,
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

      CREATE TABLE IF NOT EXISTS construction_schedules (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        contract_id TEXT,
        schedule_name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS construction_schedule_items (
        id TEXT PRIMARY KEY,
        schedule_id TEXT NOT NULL,
        process_name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        dependency TEXT NOT NULL,
        assignee TEXT NOT NULL,
        status TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        purchase_order_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        specification TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        expected_unit_price INTEGER NOT NULL,
        expected_total INTEGER NOT NULL,
        supplier_name TEXT NOT NULL,
        order_status TEXT NOT NULL,
        required_date TEXT NOT NULL,
        notes TEXT NOT NULL
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

      CREATE TABLE IF NOT EXISTS daily_site_report_items (
        item_id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        work_content_ko TEXT NOT NULL,
        crew_summary_json TEXT NOT NULL,
        material_summary_json TEXT NOT NULL,
        delay_reason_ko TEXT NOT NULL,
        tomorrow_process_ko TEXT NOT NULL,
        manager_ko TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crew_attendance_logs (
        attendance_log_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        site_name_ko TEXT NOT NULL,
        work_date TEXT NOT NULL,
        worker_name_ko TEXT NOT NULL,
        role_ko TEXT NOT NULL,
        affiliation_ko TEXT NOT NULL,
        check_in_time TEXT NOT NULL,
        check_out_time TEXT NOT NULL,
        work_hours REAL NOT NULL,
        daily_wage INTEGER NOT NULL,
        labor_cost INTEGER NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS material_receiving_logs (
        receiving_log_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        purchase_order_id TEXT NOT NULL,
        item_name_ko TEXT NOT NULL,
        specification_ko TEXT NOT NULL,
        ordered_quantity REAL NOT NULL,
        received_quantity REAL NOT NULL,
        missing_quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        received_at TEXT NOT NULL,
        supplier_name_ko TEXT NOT NULL,
        inspection_status TEXT NOT NULL,
        damage_or_missing INTEGER NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
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

      CREATE TABLE IF NOT EXISTS inspection_checklist_items (
        item_id TEXT PRIMARY KEY,
        checklist_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        process_name_ko TEXT NOT NULL,
        check_item_ko TEXT NOT NULL,
        criterion_ko TEXT NOT NULL,
        result_status TEXT NOT NULL,
        critical_flag INTEGER NOT NULL,
        photo_status TEXT NOT NULL,
        action_required_ko TEXT NOT NULL,
        inspector_ko TEXT NOT NULL,
        inspected_at TEXT NOT NULL,
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

      CREATE TABLE IF NOT EXISTS change_orders (
        change_order_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        site_name_ko TEXT NOT NULL,
        request_date TEXT NOT NULL,
        requested_by_ko TEXT NOT NULL,
        change_content_ko TEXT NOT NULL,
        change_reason_ko TEXT NOT NULL,
        additional_amount INTEGER NOT NULL,
        additional_cost INTEGER NOT NULL,
        additional_margin INTEGER NOT NULL,
        additional_margin_rate REAL NOT NULL,
        schedule_impact_days INTEGER NOT NULL,
        customer_approval_status TEXT NOT NULL,
        internal_approval_status TEXT NOT NULL,
        pce_decision TEXT NOT NULL,
        pce_id TEXT NOT NULL,
        signature_status TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS defect_reports (
        defect_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        site_name_ko TEXT NOT NULL,
        received_at TEXT NOT NULL,
        defect_location_ko TEXT NOT NULL,
        defect_type_ko TEXT NOT NULL,
        severity TEXT NOT NULL,
        root_cause_ko TEXT NOT NULL,
        manager_ko TEXT NOT NULL,
        estimated_cost INTEGER NOT NULL,
        status TEXT NOT NULL,
        completed_at TEXT,
        customer_confirmed INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS site_media_files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        report_id TEXT,
        related_entity_type TEXT NOT NULL,
        related_entity_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        media_type TEXT NOT NULL,
        caption TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS field_signatures (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        related_entity_type TEXT NOT NULL,
        related_entity_id TEXT NOT NULL,
        signer_name TEXT NOT NULL,
        signer_role TEXT NOT NULL,
        signature_text TEXT NOT NULL,
        signed_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS field_risk_reports (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        risk_type TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        immediate_action_taken INTEGER NOT NULL,
        photo_status TEXT NOT NULL,
        reported_by TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ceo_decision_queue (
        decision_id TEXT PRIMARY KEY,
        source_module TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        decision_type TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        project_id TEXT NOT NULL,
        site_name_ko TEXT NOT NULL,
        financial_impact INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        required_action_ko TEXT NOT NULL,
        deadline TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS approval_requests (
        request_id TEXT PRIMARY KEY,
        source_module TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        approved_at TEXT,
        approved_by TEXT,
        rejected_at TEXT,
        rejected_by TEXT,
        decision_reason_ko TEXT
      );

      CREATE TABLE IF NOT EXISTS red_alert_events (
        red_alert_id TEXT PRIMARY KEY,
        source_module TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        title_ko TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        severity TEXT NOT NULL,
        financial_impact INTEGER NOT NULL,
        blocking_required INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cashflow_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        snapshot_date TEXT NOT NULL,
        today_expected_inflow INTEGER NOT NULL,
        today_expected_outflow INTEGER NOT NULL,
        today_net_cashflow INTEGER NOT NULL,
        seven_day_expected_inflow INTEGER NOT NULL,
        seven_day_expected_outflow INTEGER NOT NULL,
        seven_day_net_cashflow INTEGER NOT NULL,
        receivable_amount INTEGER NOT NULL,
        payable_amount INTEGER NOT NULL,
        data_status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customer_payments (
        payment_id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        estimate_id TEXT,
        project_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        site_name TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        due_date TEXT NOT NULL,
        scheduled_amount INTEGER NOT NULL,
        actual_received_date TEXT,
        actual_received_amount INTEGER NOT NULL,
        payment_status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_payments (
        payment_id TEXT PRIMARY KEY,
        purchase_order_id TEXT NOT NULL,
        contract_id TEXT,
        project_id TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        site_name TEXT NOT NULL,
        due_date TEXT NOT NULL,
        scheduled_amount INTEGER NOT NULL,
        actual_paid_date TEXT,
        actual_paid_amount INTEGER NOT NULL,
        payment_status TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_transactions (
        transaction_id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        payment_kind TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        transaction_date TEXT NOT NULL,
        actor TEXT NOT NULL,
        notes_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_alerts (
        alert_id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        payment_kind TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        amount INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        message_ko TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS project_closing_snapshots (
        closing_snapshot_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        estimate_id TEXT,
        contract_id TEXT,
        estimated_revenue INTEGER NOT NULL,
        actual_received_revenue INTEGER NOT NULL,
        estimated_cost INTEGER NOT NULL,
        actual_cost INTEGER NOT NULL,
        expected_margin INTEGER NOT NULL,
        actual_margin INTEGER NOT NULL,
        expected_margin_rate REAL NOT NULL,
        actual_margin_rate REAL NOT NULL,
        margin_variance INTEGER NOT NULL,
        planned_start_date TEXT,
        actual_start_date TEXT,
        planned_end_date TEXT,
        actual_end_date TEXT,
        schedule_variance_days INTEGER NOT NULL,
        estimated_labor_cost INTEGER NOT NULL,
        actual_labor_cost INTEGER NOT NULL,
        estimated_material_cost INTEGER NOT NULL,
        actual_material_cost INTEGER NOT NULL,
        change_order_revenue INTEGER NOT NULL,
        change_order_cost INTEGER NOT NULL,
        defect_cost INTEGER NOT NULL,
        unpaid_receivable INTEGER NOT NULL,
        unpaid_payable INTEGER NOT NULL,
        closing_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_closing_cost_leaks (
        leak_id TEXT PRIMARY KEY,
        closing_snapshot_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        category TEXT NOT NULL,
        estimated_amount INTEGER NOT NULL,
        actual_amount INTEGER NOT NULL,
        variance_amount INTEGER NOT NULL,
        variance_rate REAL NOT NULL,
        root_cause TEXT NOT NULL,
        recommended_prevention TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_closing_reports (
        report_id TEXT PRIMARY KEY,
        closing_snapshot_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        report_status TEXT NOT NULL,
        printable_payload_json TEXT NOT NULL,
        pdf_export_ready INTEGER NOT NULL,
        excel_export_ready INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS estimate_calibration_rules (
        id TEXT PRIMARY KEY,
        source_project_id TEXT NOT NULL,
        source_category TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        adjustment_target TEXT NOT NULL,
        adjustment_value REAL NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_cost_leaks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        category TEXT NOT NULL,
        category_ko TEXT NOT NULL,
        expected_amount INTEGER NOT NULL,
        actual_amount INTEGER NOT NULL,
        variance_amount INTEGER NOT NULL,
        variance_rate REAL NOT NULL,
        root_cause TEXT NOT NULL,
        prevention_rule TEXT NOT NULL,
        severity TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_risk_patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,
        pattern_key TEXT NOT NULL,
        occurrence_count INTEGER NOT NULL,
        average_margin_loss INTEGER NOT NULL,
        average_delay_days INTEGER NOT NULL,
        recommendation TEXT NOT NULL,
        severity TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS calibration_approval_logs (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        project_id TEXT,
        decision TEXT NOT NULL,
        previous_status TEXT NOT NULL,
        next_status TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_estimate_recommendations (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        recommendation_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        suggested_action TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_estimate_warnings (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        warning_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        suggested_action TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_estimate_risk_scores (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        margin_risk TEXT NOT NULL,
        defect_risk TEXT NOT NULL,
        cost_leak_risk TEXT NOT NULL,
        risk_score_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_recommendation_actions (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        recommendation_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason_ko TEXT NOT NULL,
        created_at TEXT NOT NULL
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

      CREATE TABLE IF NOT EXISTS franchise_branches (
        id TEXT PRIMARY KEY,
        branch_name TEXT NOT NULL,
        branch_code TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        region TEXT NOT NULL,
        address TEXT NOT NULL,
        status TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS franchise_distribution_packages (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        package_type TEXT NOT NULL,
        version TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        published_at TEXT
      );

      CREATE TABLE IF NOT EXISTS franchise_branch_package_status (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        status TEXT NOT NULL,
        applied_at TEXT,
        error_message TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS branch_profit_policies (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        min_margin_rate REAL NOT NULL,
        scale_margin_rate REAL NOT NULL,
        block_threshold REAL NOT NULL,
        requires_hq_approval INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS franchise_fee_rules (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        fee_type TEXT NOT NULL,
        revenue_percent REAL NOT NULL,
        fixed_monthly_amount INTEGER NOT NULL,
        payment_due_day INTEGER NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS franchise_fee_records (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        period TEXT NOT NULL,
        branch_revenue INTEGER NOT NULL,
        calculated_fee INTEGER NOT NULL,
        paid_amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS franchise_risk_alerts (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS franchise_replication_templates (
        id TEXT PRIMARY KEY,
        template_name TEXT NOT NULL,
        version TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
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

      CREATE TABLE IF NOT EXISTS material_price_history (
        id TEXT PRIMARY KEY,
        material_category TEXT NOT NULL,
        material_name TEXT NOT NULL,
        specification TEXT NOT NULL,
        brand TEXT NOT NULL,
        vendor_id TEXT,
        vendor_name TEXT NOT NULL,
        quoted_unit_price INTEGER NOT NULL,
        actual_unit_price INTEGER NOT NULL,
        unit TEXT NOT NULL,
        source_type TEXT NOT NULL,
        related_purchase_order_id TEXT,
        recorded_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_reliability_scores (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        on_time_rate REAL NOT NULL,
        shortage_count INTEGER NOT NULL,
        defect_count INTEGER NOT NULL,
        price_variance_rate REAL NOT NULL,
        payment_issue_count INTEGER NOT NULL,
        repeat_usage_count INTEGER NOT NULL,
        manual_rating REAL NOT NULL,
        vendor_score REAL NOT NULL,
        reliability_level TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_price_alerts (
        id TEXT PRIMARY KEY,
        alert_type TEXT NOT NULL,
        material_name TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        previous_price INTEGER NOT NULL,
        current_price INTEGER NOT NULL,
        variance_rate REAL NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_price_recommendations (
        id TEXT PRIMARY KEY,
        recommendation_type TEXT NOT NULL,
        target_estimate_type TEXT NOT NULL,
        target_process TEXT NOT NULL,
        material_name TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        adjustment_type TEXT NOT NULL,
        adjustment_value REAL NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        approved_at TEXT,
        approved_by TEXT
      );

      CREATE TABLE IF NOT EXISTS process_master (
        id TEXT PRIMARY KEY,
        major_category TEXT NOT NULL,
        middle_category TEXT NOT NULL,
        minor_category TEXT NOT NULL,
        process_name TEXT NOT NULL,
        default_unit TEXT NOT NULL,
        default_labor_qty REAL NOT NULL,
        predecessor_process TEXT NOT NULL,
        successor_process TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        inspection_required INTEGER NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS material_master (
        id TEXT PRIMARY KEY,
        material_category TEXT NOT NULL,
        material_name TEXT NOT NULL,
        specification TEXT NOT NULL,
        brand TEXT NOT NULL,
        unit TEXT NOT NULL,
        default_unit_price INTEGER NOT NULL,
        latest_unit_price INTEGER NOT NULL,
        recommended_vendor TEXT NOT NULL,
        applied_process TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendor_master (
        id TEXT PRIMARY KEY,
        vendor_name TEXT NOT NULL,
        vendor_type TEXT NOT NULL,
        process_scope TEXT NOT NULL,
        contact TEXT NOT NULL,
        region TEXT NOT NULL,
        default_payment_terms TEXT NOT NULL,
        reliability_score REAL NOT NULL,
        is_active INTEGER NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS labor_master (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        process TEXT NOT NULL,
        default_daily_wage INTEGER NOT NULL,
        default_productivity REAL NOT NULL,
        skill_level TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS equipment_master (
        id TEXT PRIMARY KEY,
        equipment_name TEXT NOT NULL,
        equipment_type TEXT NOT NULL,
        unit TEXT NOT NULL,
        default_unit_price INTEGER NOT NULL,
        applied_process TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS standard_estimate_items (
        id TEXT PRIMARY KEY,
        item_name TEXT NOT NULL,
        process TEXT NOT NULL,
        default_unit TEXT NOT NULL,
        default_customer_unit_price INTEGER NOT NULL,
        default_material_cost INTEGER NOT NULL,
        default_labor_cost INTEGER NOT NULL,
        default_subcontract_cost INTEGER NOT NULL,
        default_margin_rate REAL NOT NULL,
        estimate_type TEXT NOT NULL,
        is_mandatory INTEGER NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS master_data_validation_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        warning_type TEXT NOT NULL,
        message_ko TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
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
    ensureColumn(db.project, 'estimate_drafts', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'estimate_drafts', 'lead_id', 'lead_id TEXT');
    ensureColumn(db.project, 'projects', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'bathroom_estimates', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'kitchen_estimates', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'full_remodeling_estimates', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'leads', 'area_m2', 'area_m2 REAL NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'leads', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
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
    ensureColumn(db.project, 'estimate_calibration_rules', 'estimate_type', "estimate_type TEXT NOT NULL DEFAULT 'bathroom_remodel'");
    ensureColumn(db.project, 'estimate_calibration_rules', 'process_type', "process_type TEXT NOT NULL DEFAULT 'general'");
    ensureColumn(db.project, 'estimate_calibration_rules', 'condition_json', "condition_json TEXT NOT NULL DEFAULT '{}'");
    ensureColumn(db.project, 'estimate_calibration_rules', 'adjustment_type', "adjustment_type TEXT NOT NULL DEFAULT 'MANDATORY_ITEM'");
    ensureColumn(db.project, 'estimate_calibration_rules', 'confidence_score', 'confidence_score REAL NOT NULL DEFAULT 0.5');
    ensureColumn(db.project, 'estimate_calibration_rules', 'source_project_ids', "source_project_ids TEXT NOT NULL DEFAULT '[]'");
    ensureColumn(db.project, 'estimate_calibration_rules', 'auto_generated', 'auto_generated INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'estimate_calibration_rules', 'requires_approval', 'requires_approval INTEGER NOT NULL DEFAULT 1');
    ensureColumn(db.project, 'estimate_calibration_rules', 'approved_at', 'approved_at TEXT');
    ensureColumn(db.project, 'estimate_calibration_rules', 'approved_by', 'approved_by TEXT');
    ensureColumn(db.project, 'contracts', 'estimate_id', 'estimate_id TEXT');
    ensureColumn(db.project, 'contracts', 'contract_number', 'contract_number TEXT');
    ensureColumn(db.project, 'contracts', 'customer_name', "customer_name TEXT NOT NULL DEFAULT 'UNKNOWN'");
    ensureColumn(db.project, 'contracts', 'site_name', "site_name TEXT NOT NULL DEFAULT 'UNKNOWN'");
    ensureColumn(db.project, 'contracts', 'project_name', "project_name TEXT NOT NULL DEFAULT '욕실 단독 리모델링 공사'");
    ensureColumn(db.project, 'contracts', 'deposit_amount', 'deposit_amount INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'contracts', 'progress_payment_amount', 'progress_payment_amount INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'contracts', 'balance_amount', 'balance_amount INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'contracts', 'start_date', "start_date TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'contracts', 'end_date', "end_date TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'contracts', 'duration_days', 'duration_days INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'contracts', 'payment_terms', "payment_terms TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'contracts', 'warranty_terms', "warranty_terms TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'contracts', 'cancellation_terms', "cancellation_terms TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'contracts', 'special_terms', "special_terms TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'contracts', 'status', "status TEXT NOT NULL DEFAULT 'DRAFT'");
    ensureColumn(db.project, 'contracts', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'purchase_orders', 'estimate_id', 'estimate_id TEXT');
    ensureColumn(db.project, 'purchase_orders', 'contract_id', 'contract_id TEXT');
    ensureColumn(db.project, 'purchase_orders', 'order_number', 'order_number TEXT');
    ensureColumn(db.project, 'purchase_orders', 'supplier_name', "supplier_name TEXT NOT NULL DEFAULT '거래처 미정'");
    ensureColumn(db.project, 'purchase_orders', 'total_amount', 'total_amount INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'purchase_orders', 'status', "status TEXT NOT NULL DEFAULT 'DRAFT'");
    ensureColumn(db.project, 'purchase_orders', 'required_date', "required_date TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'purchase_orders', 'updated_at', "updated_at TEXT NOT NULL DEFAULT ''");
    ensureColumn(db.project, 'purchase_orders', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'profit_decisions', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'project_closing_snapshots', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'customer_payments', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'vendor_payments', 'branch_id', "branch_id TEXT NOT NULL DEFAULT 'HEADQUARTERS'");
    ensureColumn(db.project, 'cashflow_snapshots', 'today_actual_inflow', 'today_actual_inflow INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'cashflow_snapshots', 'today_actual_outflow', 'today_actual_outflow INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'cashflow_snapshots', 'seven_day_actual_inflow', 'seven_day_actual_inflow INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'cashflow_snapshots', 'seven_day_actual_outflow', 'seven_day_actual_outflow INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'visualization_jobs', 'provider_job_id', 'provider_job_id TEXT');
    ensureColumn(db.project, 'visualization_jobs', 'workflow_preset_id', 'workflow_preset_id TEXT');
    ensureColumn(db.project, 'visualization_jobs', 'output_path', 'output_path TEXT');
    ensureColumn(db.project, 'visualization_jobs', 'retry_count', 'retry_count INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db.project, 'visualization_jobs', 'last_error', 'last_error TEXT');
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
    seedDesignBoardTemplates();

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

  function ensureHeadquartersBranch() {
    const createdAt = nowIso();
    db.master.prepare(`
      INSERT OR IGNORE INTO franchise_branches (
        id, branch_name, branch_code, owner_name, contact, region, address,
        status, opened_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('HEADQUARTERS', '본사', 'HQ', 'CEO', 'UNKNOWN', '본사', '본사 주소 미입력', 'ACTIVE', createdAt.slice(0, 10), createdAt, createdAt);
    db.master.prepare(`
      INSERT OR IGNORE INTO branch_profit_policies (
        id, branch_id, min_margin_rate, scale_margin_rate, block_threshold,
        requires_hq_approval, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('BPP-HEADQUARTERS', 'HEADQUARTERS', 0.25, 0.35, 0.25, 1, createdAt, createdAt);
  }

  function getBranchProfitPolicy(branchId = 'HEADQUARTERS') {
    ensureHeadquartersBranch();
    return db.master.prepare('SELECT * FROM branch_profit_policies WHERE branch_id = ? ORDER BY updated_at DESC LIMIT 1').get(branchId)
      || db.master.prepare('SELECT * FROM branch_profit_policies WHERE branch_id = ? ORDER BY updated_at DESC LIMIT 1').get('HEADQUARTERS')
      || { min_margin_rate: 0.25, scale_margin_rate: 0.35, block_threshold: 0.25, requires_hq_approval: 1 };
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
    branchId = 'HEADQUARTERS',
    createdAt = nowIso()
  }) {
    ensureHeadquartersBranch();
    const normalizedRevenue = Math.max(0, Math.round(Number(revenue || 0)));
    const normalizedTotalCost = Math.max(0, Math.round(Number(totalCost || 0)));
    const riskBuffer = Math.max(0, Math.round(Number(vendorRisk || 0) + Number(laborVariance || 0) + Number(scheduleRisk || 0) + Number(defectRisk || 0)));
    const realMargin = normalizedRevenue > 0
      ? Number(((normalizedRevenue - normalizedTotalCost - riskBuffer) / normalizedRevenue).toFixed(4))
      : 0;
    const policy = getBranchProfitPolicy(branchId);
    const blockMarginRate = Number(policy.block_threshold ?? policy.min_margin_rate ?? PROFIT_POLICY.blockMarginRate);
    const modifyMarginRate = Math.max(blockMarginRate, Number(policy.min_margin_rate ?? PROFIT_POLICY.modifyMarginRate) + 0.05);
    const goMarginRate = Number(policy.scale_margin_rate ?? PROFIT_POLICY.goMarginRate);
    let decision = 'BLOCK';
    if (forceDecision) decision = forceDecision;
    else if (realMargin < blockMarginRate) decision = 'BLOCK';
    else if (realMargin < modifyMarginRate) decision = 'MODIFY';
    else if (realMargin < goMarginRate) decision = 'GO';
    else decision = 'SCALE';

    const id = `PCE-${estimateId || 'NOEST'}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO profit_decisions (
        id, estimate_id, revenue, total_cost, risk_buffer, real_margin, decision, created_at, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      estimateId || 'UNKNOWN_ESTIMATE',
      normalizedRevenue,
      normalizedTotalCost,
      riskBuffer,
      realMargin,
      decision,
      createdAt,
      branchId || 'HEADQUARTERS'
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
    return { id, estimateId: estimateId || 'UNKNOWN_ESTIMATE', revenue: normalizedRevenue, totalCost: normalizedTotalCost, riskBuffer, realMargin, decision, branchId: branchId || 'HEADQUARTERS', branchPolicy: policy, createdAt };
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

  function insertLightBIMImportRecord({ sourceFileName = '', payload = null, draft = null, status = 'SUCCESS', errorMessage = '' }) {
    const createdAt = nowIso();
    const importId = `LIGHTBIM-IMPORT-${Date.now()}`;
    const summary = draft?.summary || {};
    db.project.prepare(`
      INSERT INTO lightbim_imports (
        id, source_file_name, schema_version, project_name, detected_estimate_type,
        total_area_m2, space_count, raw_json, normalized_summary_json,
        created_estimate_type, created_estimate_id, status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      importId,
      sourceFileName || '',
      summary.schemaVersion || payload?.project?.schema_version || '0.1',
      summary.projectName || payload?.project?.name || '',
      draft?.estimateType || '',
      Number(summary.totalAreaM2 || 0),
      Number(summary.spaceCount || 0),
      toJson(payload),
      toJson(summary),
      draft?.estimateType || null,
      draft?.estimateId || null,
      status,
      errorMessage || null,
      createdAt
    );
    return importId;
  }

  function importLightBIMPayload({ payload, sourceFileName = '' } = {}) {
    try {
      const parsed = parseLightBIMJSON(payload);
      const validation = validateLightBIMJSON(parsed);
      if (!validation.ok) {
        const importId = insertLightBIMImportRecord({ sourceFileName, payload: parsed || payload, status: 'FAILED', errorMessage: validation.errorMessage });
        return { ok: false, importId, errorMessage: validation.errorMessage };
      }
      const draft = createEstimateDraftFromLightBIM(parsed);
      const importId = insertLightBIMImportRecord({ sourceFileName, payload: parsed, draft, status: 'SUCCESS' });
      return { ok: true, importId, payload: parsed, draft, summary: draft.summary, messageKo: 'LightBIM 도면 데이터를 불러왔습니다.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'LightBIM JSON 형식이 올바르지 않습니다.';
      const importId = insertLightBIMImportRecord({ sourceFileName, payload, status: 'FAILED', errorMessage: message });
      return { ok: false, importId, errorMessage: message };
    }
  }

  function importLightBIMJSONFile({ filePath } = {}) {
    if (!filePath) return { ok: false, errorMessage: 'LightBIM JSON 형식이 올바르지 않습니다.' };
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return importLightBIMPayload({ payload: raw, sourceFileName: path.basename(filePath) });
    } catch (error) {
      console.error('[LightBIM] import file failed', error);
      return { ok: false, errorMessage: 'LightBIM JSON 형식이 올바르지 않습니다.' };
    }
  }

  function createEstimateFromLightBIM({ importId, payload, estimateTypeOverride = '' } = {}) {
    let parsed = payload;
    let activeImportId = importId;
    if (importId) {
      const row = db.project.prepare('SELECT * FROM lightbim_imports WHERE id = ?').get(importId);
      if (!row) return { ok: false, errorMessage: 'LightBIM JSON 형식이 올바르지 않습니다.' };
      parsed = fromJson(row.raw_json, null);
    }
    if (!parsed) {
      const imported = importLightBIMPayload({ payload });
      if (!imported.ok) return imported;
      parsed = imported.payload;
      activeImportId = imported.importId;
    }

    try {
      const draft = createEstimateDraftFromLightBIM(parsed, estimateTypeOverride);
      const estimateId = `LIGHTBIM-DRAFT-${draft.estimateType}-${Date.now()}`;
      let preview;
      let targetView;
      if (draft.estimateType === 'BATHROOM') {
        preview = calculateBathroomEstimatePreview({ ...draft.input, estimateId });
        targetView = 'bathroomEstimate';
      } else if (draft.estimateType === 'KITCHEN') {
        preview = calculateKitchenEstimatePreview({ ...draft.input, estimateId });
        targetView = 'kitchenEstimate';
      } else {
        preview = calculateFullRemodelingEstimatePreview({ ...draft.input, estimateId });
        targetView = 'fullRemodelingEstimate';
      }

      if (activeImportId) {
        const quantitySummary = preview?.estimate?.quantity_source_summary || {};
        const normalizedSummary = {
          ...draft.summary,
          applied_quantity_keys: quantitySummary.applied_quantity_keys || [],
          created_line_item_count: Array.isArray(preview?.estimate?.line_items) ? preview.estimate.line_items.length : 0,
          lightbim_bound_item_count: quantitySummary.lightbim_bound_item_count || 0,
          default_item_count: quantitySummary.default_item_count || 0,
          user_override_count: quantitySummary.user_override_count || 0
        };
        db.project.prepare(`
          UPDATE lightbim_imports
          SET created_estimate_type = ?, created_estimate_id = ?, normalized_summary_json = ?, status = ?, error_message = NULL
          WHERE id = ?
        `).run(draft.estimateType, estimateId, toJson(normalizedSummary), 'SUCCESS', activeImportId);
      }

      return {
        ok: true,
        importId: activeImportId,
        estimateId,
        estimateType: draft.estimateType,
        targetView,
        input: draft.input,
        preview,
        summary: draft.summary,
        aiPromptHints: draft.aiPromptHints,
        bannerKo: 'LightBIM 도면 데이터가 적용되었습니다.'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '견적 초안 생성에 실패했습니다.';
      if (activeImportId) {
        db.project.prepare('UPDATE lightbim_imports SET status = ?, error_message = ? WHERE id = ?').run('FAILED', message, activeImportId);
      }
      return { ok: false, importId: activeImportId, errorMessage: message };
    }
  }

  function calculateBathroomEstimatePreview(payload = {}) {
    const rawEstimate = calculateBathroomEstimate(payload);
    const { estimate, calibration } = applyApprovedCalibrationToEstimate(rawEstimate, 'bathroom_remodel');
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
      calibration,
      masterData: buildMasterDataUsageSummary('bathroom_remodel'),
      customerView: buildCustomerEstimateView(pceEstimate),
      internalView: buildInternalCostView(pceEstimate)
    };
  }

  function saveBathroomEstimate(payload = {}) {
    const createdAt = nowIso();
    const estimateId = payload.estimateId || `BATH-EST-${Date.now()}`;
    const branchId = payload.branchId || payload.branch_id || 'HEADQUARTERS';
    const rawCalculated = calculateBathroomEstimate(payload);
    const { estimate: calculated, calibration } = applyApprovedCalibrationToEstimate(rawCalculated, 'bathroom_remodel');
    const pce = runProfitControlEngine({
      estimateId,
      revenue: calculated.revenue,
      totalCost: calculated.total_cost,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0,
      branchId,
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
        revenue, total_cost, expected_margin, expected_margin_rate, pce_decision, created_at, updated_at, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      createdAt,
      branchId
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
      calibration,
      estimate: { ...calculated, pce_decision: pce.decision },
      customerView: buildCustomerEstimateView(calculated),
      internalView: buildInternalCostView({ ...calculated, pce_decision: pce.decision }),
      dashboardData: getDashboardData()
    };
  }

  function calculateKitchenEstimatePreview(payload = {}) {
    const rawEstimate = calculateKitchenEstimate(payload);
    const { estimate, calibration } = applyApprovedCalibrationToEstimate(rawEstimate, 'kitchen_remodel');
    const estimateId = payload.estimateId || `KIT-PREVIEW-${Date.now()}`;
    const pce = runProfitControlEngine({
      estimateId,
      revenue: estimate.revenue,
      totalCost: estimate.total_cost,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0
    });
    const labels = { BLOCK: '위험', MODIFY: '수정 필요', GO: '진행 가능', SCALE: '고마진 복제 대상' };
    const pceEstimate = { ...estimate, pce_decision: pce.decision, pce_label_ko: labels[pce.decision] || estimate.pce_label_ko };
    return {
      estimate: pceEstimate,
      pce,
      calibration,
      masterData: buildMasterDataUsageSummary('kitchen_remodel'),
      customerView: buildCustomerKitchenEstimateView(pceEstimate),
      internalView: buildInternalKitchenCostView(pceEstimate)
    };
  }

  function saveKitchenEstimate(payload = {}) {
    const createdAt = nowIso();
    const estimateId = payload.estimateId || `KIT-EST-${Date.now()}`;
    const branchId = payload.branchId || payload.branch_id || 'HEADQUARTERS';
    const rawCalculated = calculateKitchenEstimate(payload);
    const { estimate: calculated, calibration } = applyApprovedCalibrationToEstimate(rawCalculated, 'kitchen_remodel');
    const pce = runProfitControlEngine({
      estimateId,
      revenue: calculated.revenue,
      totalCost: calculated.total_cost,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0,
      branchId,
      createdAt
    });
    if (pce.decision === 'BLOCK' && !payload.adminOverrideReason) {
      throw new Error('PCE BLOCK: 25% 미만 마진 견적은 저장할 수 없습니다. 관리자 예외 승인 사유가 필요합니다.');
    }
    db.project.prepare(`
      INSERT OR REPLACE INTO kitchen_estimates (
        id, customer_name, site_name, kitchen_type, kitchen_length_mm, ceiling_height_mm,
        demolition_included, expansion_included, upper_cabinet_length_mm, lower_cabinet_length_mm,
        tall_cabinet, pantry, island, door_finish, countertop_type, handle_type,
        options_json, revenue, total_cost, expected_margin, expected_margin_rate,
        pce_decision, schedule_days, created_at, updated_at, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      estimateId,
      calculated.input.customerName || 'UNKNOWN',
      calculated.input.siteName || 'UNKNOWN',
      calculated.input.kitchenType,
      calculated.input.kitchenLengthMm,
      calculated.input.ceilingHeightMm,
      calculated.input.demolitionIncluded ? 1 : 0,
      calculated.input.expansionIncluded ? 1 : 0,
      calculated.input.upperCabinetLengthMm,
      calculated.input.lowerCabinetLengthMm,
      calculated.input.tallCabinet ? 1 : 0,
      calculated.input.pantry ? 1 : 0,
      calculated.input.island ? 1 : 0,
      calculated.input.doorFinish,
      calculated.input.countertopType,
      calculated.input.handleType,
      toJson(calculated.input.options),
      calculated.revenue,
      calculated.total_cost,
      calculated.expected_margin,
      calculated.expected_margin_rate,
      pce.decision,
      calculated.schedule_days,
      createdAt,
      createdAt,
      branchId
    );
    db.project.prepare('DELETE FROM kitchen_estimate_items WHERE estimate_id = ?').run(estimateId);
    const insertItem = db.project.prepare(`
      INSERT INTO kitchen_estimate_items (
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
      messageKo: `주방 견적 저장: ${estimateId} / PCE ${pce.decision} / 마진율 ${(calculated.expected_margin_rate * 100).toFixed(1)}%`,
      relatedProjectId: estimateId,
      actionKo: '주방 견적 저장',
      createdAt
    });
    return {
      estimateId,
      pce,
      calibration,
      estimate: { ...calculated, id: estimateId, pce_decision: pce.decision },
      customerView: buildCustomerKitchenEstimateView(calculated),
      internalView: buildInternalKitchenCostView({ ...calculated, pce_decision: pce.decision }),
      dashboardData: getDashboardData()
    };
  }

  function getStoredKitchenEstimateModel(estimateId) {
    if (!estimateId) throw new Error('estimateId is required');
    const row = db.project.prepare('SELECT * FROM kitchen_estimates WHERE id = ?').get(estimateId);
    if (!row) throw new Error(`Kitchen estimate not found: ${estimateId}`);
    const items = db.project.prepare('SELECT * FROM kitchen_estimate_items WHERE estimate_id = ? ORDER BY id').all(estimateId);
    const estimate = {
      id: row.id,
      documentTitle: 'Kitchen Remodeling Estimate',
      customerName: row.customer_name,
      siteName: row.site_name,
      kitchenType: row.kitchen_type,
      kitchenLengthMm: row.kitchen_length_mm,
      ceilingHeightMm: row.ceiling_height_mm,
      options: fromJson(row.options_json, {}),
      revenue: row.revenue,
      totalCost: row.total_cost,
      expectedMargin: row.expected_margin,
      expectedMarginRate: row.expected_margin_rate,
      pceDecision: row.pce_decision,
      pce_decision: row.pce_decision,
      scheduleDays: row.schedule_days,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    return {
      estimate,
      items: items.map((item) => ({
        id: item.id,
        category: item.category,
        itemName: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        customerUnitPrice: item.customer_unit_price,
        customerTotal: item.customer_total,
        materialCost: item.material_cost,
        laborCost: item.labor_cost,
        subcontractCost: item.subcontract_cost,
        internalTotal: item.internal_total,
        margin: item.margin,
        marginRate: item.margin_rate
      }))
    };
  }

  function exportKitchenEstimateDocument({ estimateId, documentType = 'customer', format = 'pdf' }) {
    const createdAt = nowIso();
    const model = getStoredKitchenEstimateModel(estimateId);
    const result = exportEstimateDocument({ model, type: documentType, format, outputDir: estimateExportDir });
    insertNotification({ level: 'INFO', messageKo: `주방 견적 출력 생성: ${result.fileName}`, relatedProjectId: estimateId, actionKo: format === 'xlsx' ? 'Excel Export' : 'PDF Export', createdAt });
    return result;
  }

  function generateKitchenContract({ estimateId, startDate = null }) {
    const createdAt = nowIso();
    const model = getStoredKitchenEstimateModel(estimateId);
    const contract = buildContractFromEstimate({ ...model, startDate });
    contract.projectName = '주방 리모델링 공사';
    contract.scopeSummaryKo = Array.from(new Set(model.items.map((item) => item.category))).join(', ');
    const contractId = contract.contractNumber;
    db.project.prepare(`
      INSERT OR REPLACE INTO contracts (
        contract_id, client_id, project_id, lead_id, contract_status, contract_amount,
        deposit_rate, interim_rate, balance_rate, scope_summary_ko, exclusions_ko,
        change_order_terms_ko, defect_warranty_terms_ko, approval_required, approved_by,
        approved_at, created_at, updated_at, estimate_id, contract_number, customer_name,
        site_name, project_name, deposit_amount, progress_payment_amount, balance_amount,
        start_date, end_date, duration_days, payment_terms, warranty_terms,
        cancellation_terms, special_terms, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contractId, `CLIENT-${estimateId}`, estimateId, null, contract.status, contract.contractAmount,
      0.3, 0.4, 0.3, contract.scopeSummaryKo, contract.specialTerms,
      '추가공사는 별도 승인 후 반영합니다.', contract.warrantyTerms, 1, null,
      null, createdAt, createdAt, estimateId, contract.contractNumber, contract.customerName,
      contract.siteName, contract.projectName, contract.depositAmount, contract.progressPaymentAmount, contract.balanceAmount,
      contract.startDate, contract.endDate, contract.durationDays, contract.paymentTerms, contract.warrantyTerms,
      contract.cancellationTerms, contract.specialTerms, contract.status
    );
    syncCustomerPaymentScheduleFromContract(contractId, createdAt);
    syncCashflowSnapshot(createdAt);
    return { contractId, contract };
  }

  function generateKitchenSchedule({ estimateId, contractId = null, startDate = null }) {
    const createdAt = nowIso();
    const model = getStoredKitchenEstimateModel(estimateId);
    const source = db.project.prepare('SELECT * FROM kitchen_estimates WHERE id = ?').get(estimateId);
    const estimate = {
      ...model.estimate,
      id: estimateId,
      input: {
        demolitionIncluded: Boolean(source.demolition_included),
        expansionIncluded: Boolean(source.expansion_included),
        kitchenType: source.kitchen_type,
        countertopType: source.countertop_type,
        options: fromJson(source.options_json, {})
      },
      line_items: model.items,
      pce_decision: source.pce_decision
    };
    const schedule = buildKitchenScheduleFromEstimate({ estimate, contractId, startDate });
    const scheduleId = `SCH-${estimateId}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO construction_schedules (
        id, estimate_id, contract_id, schedule_name, start_date, end_date,
        duration_days, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(scheduleId, estimateId, contractId, schedule.scheduleName, schedule.startDate, schedule.endDate, schedule.durationDays, schedule.status, createdAt, createdAt);
    db.project.prepare('DELETE FROM construction_schedule_items WHERE schedule_id = ?').run(scheduleId);
    const insertItem = db.project.prepare(`
      INSERT INTO construction_schedule_items (
        id, schedule_id, process_name, start_date, end_date, duration_days,
        dependency, assignee, status, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    schedule.items.forEach((item) => insertItem.run(`${scheduleId}-${String(item.sortOrder).padStart(2, '0')}`, scheduleId, item.processName, item.startDate, item.endDate, item.durationDays, item.dependency || '', item.assignee, item.status, item.sortOrder));
    return { scheduleId, schedule };
  }

  function generateKitchenPurchaseOrder({ estimateId, contractId = null, requiredDate = null }) {
    const createdAt = nowIso();
    const model = getStoredKitchenEstimateModel(estimateId);
    const row = db.project.prepare('SELECT * FROM kitchen_estimates WHERE id = ?').get(estimateId);
    const estimate = { ...model.estimate, id: estimateId, input: { options: fromJson(row.options_json, {}) }, line_items: model.items, pce_decision: row.pce_decision };
    const purchaseOrder = buildKitchenPurchaseOrderFromEstimate({ estimate, contractId, requiredDate });
    const purchaseOrderId = purchaseOrder.orderNumber;
    db.project.prepare(`
      INSERT OR REPLACE INTO purchase_orders (
        purchase_order_id, execution_project_id, project_id, order_status, unknown_price_warning,
        payload_json, created_at, estimate_id, contract_id, order_number, supplier_name,
        total_amount, status, required_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(purchaseOrderId, `EXEC-PENDING-${estimateId}`, estimateId, purchaseOrder.status, 1, toJson({ source: 'KITCHEN_ESTIMATE', itemCount: purchaseOrder.items.length }), createdAt, estimateId, contractId, purchaseOrder.orderNumber, purchaseOrder.supplierName, purchaseOrder.totalAmount, purchaseOrder.status, purchaseOrder.requiredDate, createdAt);
    db.project.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(purchaseOrderId);
    const insertItem = db.project.prepare(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_name, specification, quantity, unit,
        expected_unit_price, expected_total, supplier_name, order_status,
        required_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    purchaseOrder.items.forEach((item, index) => insertItem.run(`${purchaseOrderId}-ITEM-${String(index + 1).padStart(3, '0')}`, purchaseOrderId, item.itemName, item.specification, item.quantity, item.unit, item.expectedUnitPrice, item.expectedTotal, item.supplierName, item.orderStatus, item.requiredDate, item.notes));
    syncVendorPaymentScheduleFromPurchaseOrder(purchaseOrderId, createdAt);
    syncCashflowSnapshot(createdAt);
    return { purchaseOrderId, purchaseOrder, masterData: buildMasterDataUsageSummary('bathroom_remodel') };
  }

  function calculateFullRemodelingEstimatePreview(payload = {}) {
    const rawEstimate = calculateFullRemodelingEstimate(payload);
    const { estimate, calibration } = applyApprovedCalibrationToEstimate(rawEstimate, 'full_remodel');
    const estimateId = payload.estimateId || `FULL-PREVIEW-${Date.now()}`;
    const pce = runProfitControlEngine({
      estimateId,
      revenue: estimate.revenue,
      totalCost: estimate.total_cost,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0
    });
    const labels = { BLOCK: '차단', MODIFY: '수정 필요', GO: '진행 가능', SCALE: '고마진 복제 대상' };
    const pceEstimate = { ...estimate, pce_decision: pce.decision, pce_label_ko: labels[pce.decision] || estimate.pce_label_ko };
    return {
      estimate: pceEstimate,
      pce,
      calibration,
      masterData: buildMasterDataUsageSummary('full_remodel'),
      customerView: buildCustomerFullEstimateView(pceEstimate),
      internalView: buildInternalFullCostView(pceEstimate)
    };
  }

  function saveFullRemodelingEstimate(payload = {}) {
    const createdAt = nowIso();
    const estimateId = payload.estimateId || `FULL-EST-${Date.now()}`;
    const branchId = payload.branchId || payload.branch_id || 'HEADQUARTERS';
    const rawCalculated = calculateFullRemodelingEstimate(payload);
    const { estimate: calculated, calibration } = applyApprovedCalibrationToEstimate(rawCalculated, 'full_remodel');
    const pce = runProfitControlEngine({
      estimateId,
      revenue: calculated.revenue,
      totalCost: calculated.total_cost,
      vendorRisk: payload.vendorRisk || 0,
      laborVariance: payload.laborVariance || 0,
      scheduleRisk: payload.scheduleRisk || 0,
      defectRisk: payload.defectRisk || 0,
      branchId,
      createdAt
    });
    if (pce.decision === 'BLOCK' && !payload.adminOverrideReason) {
      throw new Error('PCE BLOCK: 25% 미만 마진 전체 리모델링 견적은 저장할 수 없습니다. 관리자 예외 승인 사유가 필요합니다.');
    }
    db.project.prepare(`
      INSERT OR REPLACE INTO full_remodeling_estimates (
        id, customer_name, site_name, housing_type, area_m2, area_pyeong,
        room_count, bathroom_count, kitchen_type, balcony_count, construction_scope,
        selected_processes_json, process_options_json, demolition_json,
        revenue, total_cost, expected_margin, expected_margin_rate,
        pce_decision, schedule_days, created_at, updated_at, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      estimateId,
      calculated.input.customerName || 'UNKNOWN',
      calculated.input.siteName || 'UNKNOWN',
      calculated.input.housingType,
      calculated.input.areaM2,
      calculated.input.areaPyeong,
      calculated.input.roomCount,
      calculated.input.bathroomCount,
      calculated.input.kitchenType,
      calculated.input.balconyCount,
      calculated.input.constructionScope,
      toJson(calculated.input.selectedProcesses),
      toJson(calculated.input.options),
      toJson(calculated.input.demolition),
      calculated.revenue,
      calculated.total_cost,
      calculated.expected_margin,
      calculated.expected_margin_rate,
      pce.decision,
      calculated.schedule_days,
      createdAt,
      createdAt,
      branchId
    );
    db.project.prepare('DELETE FROM full_remodeling_estimate_items WHERE estimate_id = ?').run(estimateId);
    const insertItem = db.project.prepare(`
      INSERT INTO full_remodeling_estimate_items (
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
      messageKo: `전체 리모델링 견적 저장: ${estimateId} / PCE ${pce.decision} / 마진율 ${(calculated.expected_margin_rate * 100).toFixed(1)}%`,
      relatedProjectId: estimateId,
      actionKo: '전체 리모델링 견적 저장',
      createdAt
    });
    return {
      estimateId,
      pce,
      calibration,
      estimate: { ...calculated, id: estimateId, pce_decision: pce.decision },
      customerView: buildCustomerFullEstimateView(calculated),
      internalView: buildInternalFullCostView({ ...calculated, pce_decision: pce.decision }),
      dashboardData: getDashboardData()
    };
  }

  function getStoredFullRemodelingEstimateModel(estimateId) {
    if (!estimateId) throw new Error('estimateId is required');
    const row = db.project.prepare('SELECT * FROM full_remodeling_estimates WHERE id = ?').get(estimateId);
    if (!row) throw new Error(`Full remodeling estimate not found: ${estimateId}`);
    const items = db.project.prepare('SELECT * FROM full_remodeling_estimate_items WHERE estimate_id = ? ORDER BY id').all(estimateId);
    const estimate = {
      id: row.id,
      documentTitle: 'Full Remodeling Estimate',
      customerName: row.customer_name,
      siteName: row.site_name,
      housingType: row.housing_type,
      areaM2: row.area_m2,
      areaPyeong: row.area_pyeong,
      roomCount: row.room_count,
      bathroomCount: row.bathroom_count,
      kitchenType: row.kitchen_type,
      balconyCount: row.balcony_count,
      constructionScope: row.construction_scope,
      selectedProcesses: fromJson(row.selected_processes_json, {}),
      options: fromJson(row.process_options_json, {}),
      demolition: fromJson(row.demolition_json, {}),
      revenue: row.revenue,
      totalCost: row.total_cost,
      expectedMargin: row.expected_margin,
      expectedMarginRate: row.expected_margin_rate,
      pceDecision: row.pce_decision,
      pce_decision: row.pce_decision,
      scheduleDays: row.schedule_days,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    return {
      estimate,
      items: items.map((item) => ({
        id: item.id,
        category: item.category,
        itemName: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        customerUnitPrice: item.customer_unit_price,
        customerTotal: item.customer_total,
        materialCost: item.material_cost,
        laborCost: item.labor_cost,
        subcontractCost: item.subcontract_cost,
        internalTotal: item.internal_total,
        margin: item.margin,
        marginRate: item.margin_rate
      }))
    };
  }

  function exportFullRemodelingEstimateDocument({ estimateId, documentType = 'customer', format = 'pdf' }) {
    const createdAt = nowIso();
    const model = getStoredFullRemodelingEstimateModel(estimateId);
    const result = exportEstimateDocument({ model, type: documentType, format, outputDir: estimateExportDir });
    insertNotification({ level: 'INFO', messageKo: `전체 리모델링 견적 출력 생성: ${result.fileName}`, relatedProjectId: estimateId, actionKo: format === 'xlsx' ? 'Excel Export' : 'PDF Export', createdAt });
    return result;
  }

  function generateFullRemodelingContract({ estimateId, startDate = null }) {
    const createdAt = nowIso();
    const model = getStoredFullRemodelingEstimateModel(estimateId);
    const contract = buildContractFromEstimate({ ...model, startDate });
    contract.projectName = '전체 리모델링 공사';
    contract.scopeSummaryKo = Array.from(new Set(model.items.map((item) => item.category))).join(', ');
    const contractId = contract.contractNumber;
    db.project.prepare(`
      INSERT OR REPLACE INTO contracts (
        contract_id, client_id, project_id, lead_id, contract_status, contract_amount,
        deposit_rate, interim_rate, balance_rate, scope_summary_ko, exclusions_ko,
        change_order_terms_ko, defect_warranty_terms_ko, approval_required, approved_by,
        approved_at, created_at, updated_at, estimate_id, contract_number, customer_name,
        site_name, project_name, deposit_amount, progress_payment_amount, balance_amount,
        start_date, end_date, duration_days, payment_terms, warranty_terms,
        cancellation_terms, special_terms, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contractId, `CLIENT-${estimateId}`, estimateId, null, contract.status, contract.contractAmount,
      0.3, 0.4, 0.3, contract.scopeSummaryKo, contract.specialTerms,
      '추가공사는 별도 승인 후 반영합니다.', contract.warrantyTerms, 1, null,
      null, createdAt, createdAt, estimateId, contract.contractNumber, contract.customerName,
      contract.siteName, contract.projectName, contract.depositAmount, contract.progressPaymentAmount, contract.balanceAmount,
      contract.startDate, contract.endDate, contract.durationDays, contract.paymentTerms, contract.warrantyTerms,
      contract.cancellationTerms, contract.specialTerms, contract.status
    );
    syncCustomerPaymentScheduleFromContract(contractId, createdAt);
    syncCashflowSnapshot(createdAt);
    return { contractId, contract };
  }

  function generateFullRemodelingSchedule({ estimateId, contractId = null, startDate = null }) {
    const createdAt = nowIso();
    const model = getStoredFullRemodelingEstimateModel(estimateId);
    const row = db.project.prepare('SELECT * FROM full_remodeling_estimates WHERE id = ?').get(estimateId);
    const estimate = {
      ...model.estimate,
      id: estimateId,
      input: {
        selectedProcesses: fromJson(row.selected_processes_json, {}),
        options: fromJson(row.process_options_json, {}),
        demolition: fromJson(row.demolition_json, {})
      },
      process_summary: (() => {
        const groups = new Map();
        for (const item of model.items) {
          const current = groups.get(item.category) || { category: item.category, customerTotal: 0, internalTotal: 0, margin: 0 };
          current.customerTotal += item.customerTotal;
          current.internalTotal += item.internalTotal;
          current.margin += item.margin;
          groups.set(item.category, current);
        }
        return Array.from(groups.values());
      })(),
      line_items: model.items,
      pce_decision: row.pce_decision
    };
    const schedule = buildFullScheduleFromEstimate({ estimate, contractId, startDate });
    const scheduleId = `SCH-${estimateId}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO construction_schedules (
        id, estimate_id, contract_id, schedule_name, start_date, end_date,
        duration_days, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(scheduleId, estimateId, contractId, schedule.scheduleName, schedule.startDate, schedule.endDate, schedule.durationDays, schedule.status, createdAt, createdAt);
    db.project.prepare('DELETE FROM construction_schedule_items WHERE schedule_id = ?').run(scheduleId);
    const insertItem = db.project.prepare(`
      INSERT INTO construction_schedule_items (
        id, schedule_id, process_name, start_date, end_date, duration_days,
        dependency, assignee, status, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    schedule.items.forEach((item) => insertItem.run(`${scheduleId}-${String(item.sortOrder).padStart(2, '0')}`, scheduleId, item.processName, item.startDate, item.endDate, item.durationDays, item.dependency || '', item.assignee, item.status, item.sortOrder));
    return { scheduleId, schedule };
  }

  function generateFullRemodelingPurchaseOrder({ estimateId, contractId = null, requiredDate = null }) {
    const createdAt = nowIso();
    const model = getStoredFullRemodelingEstimateModel(estimateId);
    const row = db.project.prepare('SELECT * FROM full_remodeling_estimates WHERE id = ?').get(estimateId);
    const estimate = { ...model.estimate, id: estimateId, line_items: model.items, pce_decision: row.pce_decision };
    const purchaseOrder = buildFullPurchaseOrderFromEstimate({ estimate, contractId, requiredDate });
    const purchaseOrderId = purchaseOrder.orderNumber;
    db.project.prepare(`
      INSERT OR REPLACE INTO purchase_orders (
        purchase_order_id, execution_project_id, project_id, order_status, unknown_price_warning,
        payload_json, created_at, estimate_id, contract_id, order_number, supplier_name,
        total_amount, status, required_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(purchaseOrderId, `EXEC-PENDING-${estimateId}`, estimateId, purchaseOrder.status, 1, toJson({ source: 'FULL_REMODELING_ESTIMATE', itemCount: purchaseOrder.items.length }), createdAt, estimateId, contractId, purchaseOrder.orderNumber, purchaseOrder.supplierName, purchaseOrder.totalAmount, purchaseOrder.status, purchaseOrder.requiredDate, createdAt);
    db.project.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(purchaseOrderId);
    const insertItem = db.project.prepare(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_name, specification, quantity, unit,
        expected_unit_price, expected_total, supplier_name, order_status,
        required_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    purchaseOrder.items.forEach((item, index) => insertItem.run(`${purchaseOrderId}-ITEM-${String(index + 1).padStart(3, '0')}`, purchaseOrderId, item.itemName, item.specification, item.quantity, item.unit, item.expectedUnitPrice, item.expectedTotal, item.supplierName, item.orderStatus, item.requiredDate, item.notes));
    syncVendorPaymentScheduleFromPurchaseOrder(purchaseOrderId, createdAt);
    syncCashflowSnapshot(createdAt);
    return { purchaseOrderId, purchaseOrder, masterData: buildMasterDataUsageSummary('kitchen_remodel') };
  }

  function mapFloorplan(row) {
    if (!row) return null;
    return {
      id: row.id,
      estimateId: row.estimate_id,
      projectId: row.project_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type,
      width: row.width,
      height: row.height,
      createdAt: row.created_at
    };
  }

  function mapFloorplanSpace(row) {
    if (!row) return null;
    return {
      id: row.id,
      floorplanId: row.floorplan_id,
      spaceName: row.space_name,
      spaceType: row.space_type,
      areaM2: row.area_m2,
      notes: row.notes,
      createdAt: row.created_at
    };
  }

  function mapSpaceEstimateLink(row) {
    if (!row) return null;
    return {
      id: row.id,
      spaceId: row.space_id,
      estimateType: row.estimate_type,
      estimateId: row.estimate_id,
      estimateItemId: row.estimate_item_id,
      itemName: row.item_name,
      amount: row.amount,
      cost: row.cost,
      margin: row.margin,
      createdAt: row.created_at
    };
  }

  function buildSpaceSummary(links) {
    const groups = new Map();
    links.forEach((link) => {
      const current = groups.get(link.spaceId) || { spaceId: link.spaceId, amount: 0, cost: 0, margin: 0, marginRate: 0, linkCount: 0 };
      current.amount += Number(link.amount || 0);
      current.cost += Number(link.cost || 0);
      current.margin += Number(link.margin || 0);
      current.linkCount += 1;
      current.marginRate = current.amount > 0 ? Number((current.margin / current.amount).toFixed(4)) : 0;
      groups.set(link.spaceId, current);
    });
    return Array.from(groups.values());
  }

  function buildIsometricPreviewData(spaces, summaries) {
    const summaryMap = new Map(summaries.map((item) => [item.spaceId, item]));
    return {
      mode: 'BLOCK_PLACEHOLDER',
      blocks: spaces.map((space, index) => {
        const columns = 4;
        const width = Math.max(70, Math.sqrt(Number(space.areaM2 || 1)) * 24);
        const depth = Math.max(50, Math.sqrt(Number(space.areaM2 || 1)) * 18);
        const x = (index % columns) * 150;
        const y = Math.floor(index / columns) * 110;
        const summary = summaryMap.get(space.id) || { amount: 0, cost: 0, margin: 0 };
        return {
          id: space.id,
          labelKo: space.spaceName,
          spaceType: space.spaceType,
          areaM2: space.areaM2,
          x,
          y,
          width,
          depth,
          height: 24,
          amount: summary.amount,
          cost: summary.cost,
          margin: summary.margin
        };
      })
    };
  }

  function saveFloorplanMetadata(payload = {}) {
    const createdAt = nowIso();
    const floorplanId = payload.floorplanId || `FLP-${Date.now()}`;
    const fileName = String(payload.fileName || payload.file_name || 'UNKNOWN_FILE');
    const filePath = String(payload.filePath || payload.file_path || fileName);
    const fileType = String(payload.fileType || payload.file_type || path.extname(fileName).replace('.', '').toUpperCase() || 'UNKNOWN').toUpperCase();
    db.project.prepare(`
      INSERT OR REPLACE INTO floorplans (
        id, estimate_id, project_id, file_name, file_path, file_type, width, height, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      floorplanId,
      payload.estimateId || null,
      payload.projectId || null,
      fileName,
      filePath,
      fileType,
      Number(payload.width || 0),
      Number(payload.height || 0),
      createdAt
    );
    insertNotification({ level: 'INFO', messageKo: `평면도 메타데이터 저장: ${fileName}`, relatedProjectId: payload.projectId || payload.estimateId || floorplanId, actionKo: '평면도 저장', createdAt });
    return { floorplanId, floorplan: mapFloorplan(db.project.prepare('SELECT * FROM floorplans WHERE id = ?').get(floorplanId)), floorplanCenterData: getFloorplanCenterData({ floorplanId }) };
  }

  function createFloorplanSpace(payload = {}) {
    const createdAt = nowIso();
    if (!payload.floorplanId) throw new Error('floorplanId is required');
    const spaceId = payload.spaceId || `SPACE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.project.prepare(`
      INSERT INTO floorplan_spaces (
        id, floorplan_id, space_name, space_type, area_m2, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(spaceId, payload.floorplanId, String(payload.spaceName || '공간'), String(payload.spaceType || '기타'), Number(payload.areaM2 || 0), String(payload.notes || ''), createdAt);
    return { spaceId, space: mapFloorplanSpace(db.project.prepare('SELECT * FROM floorplan_spaces WHERE id = ?').get(spaceId)), floorplanCenterData: getFloorplanCenterData({ floorplanId: payload.floorplanId }) };
  }

  function linkEstimateItemToSpace(payload = {}) {
    const createdAt = nowIso();
    if (!payload.spaceId) throw new Error('spaceId is required');
    const linkId = payload.linkId || `SEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.project.prepare(`
      INSERT INTO space_estimate_links (
        id, space_id, estimate_type, estimate_id, estimate_item_id, item_name,
        amount, cost, margin, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      linkId,
      payload.spaceId,
      String(payload.estimateType || 'manual'),
      String(payload.estimateId || 'UNKNOWN_ESTIMATE'),
      payload.estimateItemId || null,
      String(payload.itemName || '견적 항목'),
      Math.round(Number(payload.amount || 0)),
      Math.round(Number(payload.cost || 0)),
      Math.round(Number(payload.margin || 0)),
      createdAt
    );
    const space = db.project.prepare('SELECT * FROM floorplan_spaces WHERE id = ?').get(payload.spaceId);
    return { linkId, link: mapSpaceEstimateLink(db.project.prepare('SELECT * FROM space_estimate_links WHERE id = ?').get(linkId)), floorplanCenterData: getFloorplanCenterData({ floorplanId: space?.floorplan_id }) };
  }

  function saveMoodboardProfile(payload = {}) {
    const createdAt = nowIso();
    const moodboardId = payload.moodboardId || `MOOD-${Date.now()}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO moodboard_profiles (
        id, estimate_id, floorplan_id, style, color_tone, primary_materials,
        lighting_mood, reference_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      moodboardId,
      payload.estimateId || null,
      payload.floorplanId || null,
      String(payload.style || 'modern'),
      String(payload.colorTone || 'warm neutral'),
      String(payload.primaryMaterials || 'wood, tile, paint'),
      String(payload.lightingMood || 'soft indirect lighting'),
      String(payload.referenceNotes || ''),
      createdAt,
      createdAt
    );
    return { moodboardId, moodboard: db.project.prepare('SELECT * FROM moodboard_profiles WHERE id = ?').get(moodboardId), floorplanCenterData: getFloorplanCenterData({ floorplanId: payload.floorplanId, estimateId: payload.estimateId }) };
  }

  function generatePerspectivePrompt(payload = {}) {
    const createdAt = nowIso();
    const promptId = payload.promptId || `DPO-${Date.now()}`;
    const space = payload.spaceId ? mapFloorplanSpace(db.project.prepare('SELECT * FROM floorplan_spaces WHERE id = ?').get(payload.spaceId)) : null;
    const moodboard = payload.moodboardId ? db.project.prepare('SELECT * FROM moodboard_profiles WHERE id = ?').get(payload.moodboardId) : null;
    const promptType = String(payload.promptType || 'PERSPECTIVE');
    const style = payload.style || moodboard?.style || 'modern Korean interior';
    const colorTone = payload.colorTone || moodboard?.color_tone || 'warm neutral';
    const materials = payload.primaryMaterials || moodboard?.primary_materials || 'wood, tile, painted wall';
    const lighting = payload.lightingMood || moodboard?.lighting_mood || 'soft indirect lighting';
    const promptText = [
      `${promptType} render prompt for ${space?.spaceName || 'interior space'}`,
      `space type: ${space?.spaceType || 'interior'}, area: ${space?.areaM2 || 'unknown'} m2`,
      `style: ${style}`,
      `color tone: ${colorTone}`,
      `primary materials: ${materials}`,
      `lighting mood: ${lighting}`,
      `use clean architectural visualization, realistic proportions, Korean apartment remodeling context`,
      `exclude people, text, watermark, distorted geometry`
    ].join('\n');
    db.project.prepare(`
      INSERT INTO design_prompt_outputs (
        id, floorplan_id, space_id, estimate_id, prompt_type, prompt_text, source_payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(promptId, payload.floorplanId || space?.floorplanId || null, payload.spaceId || null, payload.estimateId || null, promptType, promptText, toJson({ ...payload, moodboard }), createdAt);
    return { promptId, promptText, floorplanCenterData: getFloorplanCenterData({ floorplanId: payload.floorplanId || space?.floorplanId, estimateId: payload.estimateId }) };
  }

  function getFloorplanCenterData({ floorplanId = null, estimateId = null, projectId = null } = {}) {
    let floorplans = [];
    if (floorplanId) floorplans = db.project.prepare('SELECT * FROM floorplans WHERE id = ? ORDER BY created_at DESC').all(floorplanId);
    else if (estimateId) floorplans = db.project.prepare('SELECT * FROM floorplans WHERE estimate_id = ? ORDER BY created_at DESC').all(estimateId);
    else if (projectId) floorplans = db.project.prepare('SELECT * FROM floorplans WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
    else floorplans = db.project.prepare('SELECT * FROM floorplans ORDER BY created_at DESC LIMIT 20').all();

    const activeFloorplan = mapFloorplan(floorplans[0]);
    const spaces = activeFloorplan ? db.project.prepare('SELECT * FROM floorplan_spaces WHERE floorplan_id = ? ORDER BY created_at ASC').all(activeFloorplan.id).map(mapFloorplanSpace) : [];
    const links = spaces.length
      ? db.project.prepare(`SELECT * FROM space_estimate_links WHERE space_id IN (${spaces.map(() => '?').join(',')}) ORDER BY created_at ASC`).all(...spaces.map((space) => space.id)).map(mapSpaceEstimateLink)
      : [];
    const summaries = buildSpaceSummary(links).map((summary) => ({ ...summary, space: spaces.find((space) => space.id === summary.spaceId) || null }));
    const prompts = activeFloorplan ? db.project.prepare('SELECT * FROM design_prompt_outputs WHERE floorplan_id = ? ORDER BY created_at DESC LIMIT 20').all(activeFloorplan.id) : [];
    const moodboards = activeFloorplan ? db.project.prepare('SELECT * FROM moodboard_profiles WHERE floorplan_id = ? ORDER BY updated_at DESC LIMIT 10').all(activeFloorplan.id) : [];
    return {
      floorplans: floorplans.map(mapFloorplan),
      activeFloorplan,
      spaces,
      links,
      summaries,
      isometricPreview: buildIsometricPreviewData(spaces, summaries),
      prompts,
      moodboards,
      emptyState: !activeFloorplan
    };
  }

  function mapVisualizationBrief(row) {
    if (!row) return null;
    return {
      id: row.id,
      estimateType: row.estimate_type,
      estimateId: row.estimate_id,
      floorplanId: row.floorplan_id,
      spaceId: row.space_id,
      projectName: row.project_name,
      customerName: row.customer_name,
      spaceName: row.space_name,
      spaceType: row.space_type,
      areaM2: row.area_m2,
      style: row.style,
      colorTone: row.color_tone,
      materialKeywords: row.material_keywords,
      lightingMood: row.lighting_mood,
      designNotes: row.design_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapVisualizationJob(row) {
    if (!row) return null;
    return {
      id: row.id,
      briefId: row.brief_id,
      promptType: row.prompt_type,
      prompt: row.prompt,
      negativePrompt: row.negative_prompt,
      provider: row.provider,
      status: row.status,
      requestedAt: row.requested_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      providerJobId: row.provider_job_id,
      workflowPresetId: row.workflow_preset_id,
      outputPath: row.output_path,
      retryCount: row.retry_count,
      lastError: row.last_error
    };
  }

  function mapVisualizationResult(row) {
    if (!row) return null;
    return {
      id: row.id,
      jobId: row.job_id,
      briefId: row.brief_id,
      imagePath: row.image_path,
      thumbnailPath: row.thumbnail_path,
      resultType: row.result_type,
      status: row.status,
      reviewNote: row.review_note,
      approvedAt: row.approved_at,
      createdAt: row.created_at
    };
  }

  function getVisualizationBriefRow(briefId) {
    return db.project.prepare('SELECT * FROM visualization_briefs WHERE id = ?').get(briefId);
  }

  function mapComfyUiSettings(row) {
    if (!row) return null;
    return {
      id: row.id,
      host: row.host,
      port: row.port,
      baseUrl: row.base_url,
      defaultWorkflowId: row.default_workflow_id,
      isEnabled: Boolean(row.is_enabled),
      lastHealthStatus: row.last_health_status,
      lastCheckedAt: row.last_checked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapComfyUiWorkflowPreset(row) {
    if (!row) return null;
    return {
      id: row.id,
      presetName: row.preset_name,
      presetType: row.preset_type,
      workflowJson: row.workflow_json,
      workflow: fromJson(row.workflow_json, {}),
      positivePromptNodeId: row.positive_prompt_node_id,
      negativePromptNodeId: row.negative_prompt_node_id,
      seedNodeId: row.seed_node_id,
      widthNodeId: row.width_node_id,
      heightNodeId: row.height_node_id,
      outputNodeId: row.output_node_id,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function getComfyUiSettingsRow() {
    let row = db.project.prepare('SELECT * FROM comfyui_settings WHERE id = ?').get('DEFAULT');
    if (!row) {
      const createdAt = nowIso();
      db.project.prepare(`
        INSERT INTO comfyui_settings (
          id, host, port, base_url, default_workflow_id, is_enabled,
          last_health_status, last_checked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('DEFAULT', '127.0.0.1', 8188, 'http://127.0.0.1:8188', null, 0, 'NOT_CHECKED', null, createdAt, createdAt);
      row = db.project.prepare('SELECT * FROM comfyui_settings WHERE id = ?').get('DEFAULT');
    }
    return row;
  }

  function getComfyUiSettingsData() {
    const settings = mapComfyUiSettings(getComfyUiSettingsRow());
    const presets = db.project.prepare('SELECT * FROM comfyui_workflow_presets ORDER BY updated_at DESC').all().map(mapComfyUiWorkflowPreset);
    return {
      settings,
      presets,
      jobLogs: db.project.prepare('SELECT * FROM comfyui_job_logs ORDER BY created_at DESC LIMIT 30').all()
    };
  }

  function saveComfyUiSettings(payload = {}) {
    const current = getComfyUiSettingsRow();
    const updatedAt = nowIso();
    const host = String(payload.host || current.host || '127.0.0.1');
    const port = Number(payload.port || current.port || 8188);
    const baseUrl = String(payload.baseUrl || payload.base_url || `http://${host}:${port}`).replace(/\/$/, '');
    db.project.prepare(`
      UPDATE comfyui_settings
      SET host = ?, port = ?, base_url = ?, default_workflow_id = ?, is_enabled = ?, updated_at = ?
      WHERE id = ?
    `).run(host, port, baseUrl, payload.defaultWorkflowId || payload.default_workflow_id || current.default_workflow_id || null, payload.isEnabled === false ? 0 : 1, updatedAt, 'DEFAULT');
    return getComfyUiSettingsData();
  }

  function saveComfyUiWorkflowPreset(payload = {}) {
    const createdAt = nowIso();
    const presetId = payload.presetId || `COMFY-PRESET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const workflowJson = typeof payload.workflowJson === 'string' ? payload.workflowJson : toJson(payload.workflow || {});
    JSON.parse(workflowJson);
    db.project.prepare(`
      INSERT OR REPLACE INTO comfyui_workflow_presets (
        id, preset_name, preset_type, workflow_json, positive_prompt_node_id,
        negative_prompt_node_id, seed_node_id, width_node_id, height_node_id,
        output_node_id, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      presetId,
      String(payload.presetName || '기본 ComfyUI 워크플로우'),
      String(payload.presetType || 'PERSPECTIVE').toUpperCase(),
      workflowJson,
      String(payload.positivePromptNodeId || ''),
      String(payload.negativePromptNodeId || ''),
      payload.seedNodeId || null,
      payload.widthNodeId || null,
      payload.heightNodeId || null,
      payload.outputNodeId || null,
      payload.isActive === false ? 0 : 1,
      payload.createdAt || createdAt,
      createdAt
    );
    if (payload.setDefault) {
      db.project.prepare('UPDATE comfyui_settings SET default_workflow_id = ?, updated_at = ? WHERE id = ?').run(presetId, createdAt, 'DEFAULT');
    }
    return { presetId, preset: mapComfyUiWorkflowPreset(db.project.prepare('SELECT * FROM comfyui_workflow_presets WHERE id = ?').get(presetId)), comfyUiData: getComfyUiSettingsData() };
  }

  function getComfyUiPresetForJob(job, explicitPresetId = null) {
    const settings = getComfyUiSettingsRow();
    const presetId = explicitPresetId || job.workflow_preset_id || settings.default_workflow_id;
    if (presetId) {
      const row = db.project.prepare('SELECT * FROM comfyui_workflow_presets WHERE id = ?').get(presetId);
      if (row) return mapComfyUiWorkflowPreset(row);
    }
    return mapComfyUiWorkflowPreset(db.project.prepare(`
      SELECT *
      FROM comfyui_workflow_presets
      WHERE preset_type = ? AND is_active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(job.prompt_type));
  }

  function insertComfyUiJobLog({ visualizationJobId, providerJobId = null, action, status, message }) {
    const createdAt = nowIso();
    const logId = `COMFY-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.project.prepare(`
      INSERT INTO comfyui_job_logs (
        id, visualization_job_id, provider_job_id, action, status, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, visualizationJobId, providerJobId, action, status, message, createdAt);
    return logId;
  }

  function createVisualizationBrief(payload = {}) {
    const createdAt = nowIso();
    const briefId = payload.briefId || `VIS-BRIEF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const space = payload.spaceId ? mapFloorplanSpace(db.project.prepare('SELECT * FROM floorplan_spaces WHERE id = ?').get(payload.spaceId)) : null;
    const floorplanId = payload.floorplanId || space?.floorplanId || null;
    const moodboard = payload.moodboardId
      ? db.project.prepare('SELECT * FROM moodboard_profiles WHERE id = ?').get(payload.moodboardId)
      : floorplanId
        ? db.project.prepare('SELECT * FROM moodboard_profiles WHERE floorplan_id = ? ORDER BY updated_at DESC LIMIT 1').get(floorplanId)
        : null;
    const floorplan = floorplanId ? mapFloorplan(db.project.prepare('SELECT * FROM floorplans WHERE id = ?').get(floorplanId)) : null;
    const designNotes = [
      payload.designNotes || '',
      space?.notes ? `space notes: ${space.notes}` : '',
      floorplan?.fileName ? `floorplan file: ${floorplan.fileName}` : '',
      payload.isometricNotes ? `isometric notes: ${payload.isometricNotes}` : ''
    ].filter(Boolean).join('\n');

    db.project.prepare(`
      INSERT OR REPLACE INTO visualization_briefs (
        id, estimate_type, estimate_id, floorplan_id, space_id, project_name,
        customer_name, space_name, space_type, area_m2, style, color_tone,
        material_keywords, lighting_mood, design_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      briefId,
      String(payload.estimateType || payload.estimate_type || 'manual'),
      payload.estimateId || null,
      floorplanId,
      payload.spaceId || null,
      String(payload.projectName || '미지정 프로젝트'),
      String(payload.customerName || '미지정 고객'),
      String(payload.spaceName || space?.spaceName || '공간'),
      String(payload.spaceType || space?.spaceType || '기타'),
      Number(payload.areaM2 || space?.areaM2 || 0),
      String(payload.style || moodboard?.style || 'modern Korean interior'),
      String(payload.colorTone || moodboard?.color_tone || 'warm neutral'),
      String(payload.materialKeywords || payload.selectedMaterials || moodboard?.primary_materials || 'selected materials only'),
      String(payload.lightingMood || moodboard?.lighting_mood || 'soft realistic lighting'),
      designNotes,
      createdAt,
      createdAt
    );

    const brief = mapVisualizationBrief(getVisualizationBriefRow(briefId));
    insertNotification({ level: 'INFO', messageKo: `AI 이미지 브리프 생성: ${brief.spaceName}`, relatedProjectId: brief.estimateId || brief.floorplanId || brief.id, actionKo: 'AI 시각화', createdAt });
    return { briefId, brief, prompts: buildVisualizationPromptSet(brief), visualizationData: getAIVisualizationCenterData({ briefId }) };
  }

  function generateVisualizationPrompts(payload = {}) {
    const briefRow = payload.briefId ? getVisualizationBriefRow(payload.briefId) : null;
    const brief = mapVisualizationBrief(briefRow) || {
      spaceName: payload.spaceName || 'interior space',
      spaceType: payload.spaceType || 'interior',
      areaM2: payload.areaM2 || 0,
      style: payload.style || 'modern Korean interior',
      colorTone: payload.colorTone || 'warm neutral',
      materialKeywords: payload.materialKeywords || payload.selectedMaterials || 'selected materials only',
      lightingMood: payload.lightingMood || 'soft realistic lighting',
      designNotes: payload.designNotes || ''
    };
    return { brief, prompts: buildVisualizationPromptSet(brief) };
  }

  function runVisualizationProvider(provider, job) {
    if (provider === 'COMFYUI') return { provider: 'COMFYUI', status: 'READY_FOR_COMFYUI', message: 'ComfyUI generation must be executed from ComfyUI action.' };
    if (provider === 'EXTERNAL_API') return requestExternalApiGeneration(job);
    return requestManualGeneration(job);
  }

  function queueVisualizationJob(payload = {}) {
    const createdAt = nowIso();
    if (!payload.briefId) throw new Error('briefId is required');
    const promptType = String(payload.promptType || 'PERSPECTIVE').toUpperCase();
    const provider = String(payload.provider || 'MANUAL').toUpperCase();
    const promptSet = generateVisualizationPrompts({ briefId: payload.briefId }).prompts;
    const prompt = String(payload.prompt || pickPromptByType(promptSet, promptType));
    const negativePrompt = String(payload.negativePrompt || promptSet.negativePrompt);
    const jobId = payload.jobId || `VIS-JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const providerResult = runVisualizationProvider(provider, { jobId, promptType, prompt, negativePrompt });
    const status = providerResult.status === 'PROVIDER_NOT_CONFIGURED' ? 'FAILED' : String(payload.status || 'QUEUED');
    const errorMessage = providerResult.errorMessage || null;
    db.project.prepare(`
      INSERT INTO visualization_jobs (
        id, brief_id, prompt_type, prompt, negative_prompt, provider, status,
        requested_at, started_at, completed_at, error_message, provider_job_id,
        workflow_preset_id, output_path, retry_count, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(jobId, payload.briefId, promptType, prompt, negativePrompt, provider, status, createdAt, null, null, errorMessage, null, payload.workflowPresetId || null, null, 0, errorMessage);
    insertNotification({ level: status === 'FAILED' ? 'WARNING' : 'INFO', messageKo: `AI 이미지 생성 대기 등록: ${promptType}`, relatedProjectId: payload.briefId, actionKo: '시각화 대기열', createdAt });
    return { jobId, job: mapVisualizationJob(db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(jobId)), providerResult, visualizationData: getAIVisualizationCenterData({ briefId: payload.briefId }) };
  }

  async function checkComfyUiHealth() {
    const checkedAt = nowIso();
    const settings = mapComfyUiSettings(getComfyUiSettingsRow());
    const result = await comfyUiHealthCheck(settings);
    db.project.prepare(`
      UPDATE comfyui_settings
      SET last_health_status = ?, last_checked_at = ?, updated_at = ?
      WHERE id = ?
    `).run(result.status, checkedAt, checkedAt, 'DEFAULT');
    return { ...result, comfyUiData: getComfyUiSettingsData() };
  }

  function saveComfyUiFailedJob(jobId, message, action = 'COMFYUI_FAILED') {
    const updatedAt = nowIso();
    db.project.prepare(`
      UPDATE visualization_jobs
      SET provider = 'COMFYUI', status = 'FAILED', completed_at = ?, error_message = ?, last_error = ?,
          retry_count = retry_count + 1
      WHERE id = ?
    `).run(updatedAt, message, message, jobId);
    insertComfyUiJobLog({ visualizationJobId: jobId, action, status: 'FAILED', message });
    return mapVisualizationJob(db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(jobId));
  }

  function saveSimulatedComfyUiResult(job, presetId = null) {
    fs.mkdirSync(visualizationExportDir, { recursive: true });
    const completedAt = nowIso();
    const filePath = path.join(visualizationExportDir, `visualization_${job.id}_${Date.now()}.png`);
    const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(filePath, onePixelPng);
    db.project.prepare(`
      UPDATE visualization_jobs
      SET provider = 'COMFYUI', status = 'COMPLETED', provider_job_id = ?, workflow_preset_id = ?,
          output_path = ?, started_at = COALESCE(started_at, ?), completed_at = ?, error_message = NULL, last_error = NULL
      WHERE id = ?
    `).run(`SIM-${job.id}`, presetId, filePath, completedAt, completedAt, job.id);
    const attached = attachVisualizationResult({ jobId: job.id, imagePath: filePath, resultType: job.prompt_type, status: 'PENDING_REVIEW' });
    insertComfyUiJobLog({ visualizationJobId: job.id, providerJobId: `SIM-${job.id}`, action: 'SIMULATED_GENERATION', status: 'COMPLETED', message: filePath });
    return { jobId: job.id, job: mapVisualizationJob(db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(job.id)), result: attached.result, visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
  }

  async function runComfyUiGeneration(payload = {}) {
    const startedAt = nowIso();
    if (!payload.jobId) throw new Error('jobId is required');
    const job = db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(payload.jobId);
    if (!job) throw new Error('visualization job not found');
    const preset = getComfyUiPresetForJob(job, payload.workflowPresetId);
    if (!preset && !payload.simulateSuccess) {
      const failed = saveComfyUiFailedJob(job.id, 'ComfyUI 워크플로우 프리셋이 없습니다.', 'MISSING_WORKFLOW_PRESET');
      return { ok: false, errorMessage: failed.lastError, job: failed, visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
    }
    if (payload.simulateSuccess) return saveSimulatedComfyUiResult(job, preset?.id || payload.workflowPresetId || null);

    const settings = mapComfyUiSettings(getComfyUiSettingsRow());
    const health = await comfyUiHealthCheck(settings);
    if (!health.ok) {
      const failed = saveComfyUiFailedJob(job.id, 'ComfyUI가 실행 중이 아닙니다. ComfyUI를 실행한 뒤 다시 시도하세요.', 'HEALTH_CHECK');
      db.project.prepare('UPDATE comfyui_settings SET last_health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?').run(health.status, startedAt, startedAt, 'DEFAULT');
      return { ok: false, health, errorMessage: failed.lastError, job: failed, visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
    }

    const workflow = injectPromptIntoWorkflow(preset.workflow, preset, {
      prompt: job.prompt,
      negativePrompt: job.negative_prompt,
      seed: payload.seed,
      width: payload.width,
      height: payload.height
    });
    db.project.prepare(`
      UPDATE visualization_jobs
      SET provider = 'COMFYUI', status = 'GENERATING', workflow_preset_id = ?, started_at = ?, error_message = NULL, last_error = NULL
      WHERE id = ?
    `).run(preset.id, startedAt, job.id);
    const queue = await queueComfyUiPrompt(settings, workflow, { clientId: `ecorean-${job.id}` });
    if (queue.status === 'FAILED') {
      const failed = saveComfyUiFailedJob(job.id, queue.errorMessage || 'ComfyUI 생성 요청 실패', 'QUEUE_PROMPT');
      return { ok: false, providerResult: queue, errorMessage: failed.lastError, job: failed, visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
    }
    db.project.prepare('UPDATE visualization_jobs SET provider_job_id = ?, status = ? WHERE id = ?').run(queue.providerJobId, 'GENERATING', job.id);
    insertComfyUiJobLog({ visualizationJobId: job.id, providerJobId: queue.providerJobId, action: 'QUEUE_PROMPT', status: 'GENERATING', message: 'ComfyUI 생성 요청 완료' });
    return { ok: true, providerResult: queue, job: mapVisualizationJob(db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(job.id)), visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
  }

  async function refreshComfyUiJobStatus(payload = {}) {
    if (!payload.jobId) throw new Error('jobId is required');
    const job = db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(payload.jobId);
    if (!job) throw new Error('visualization job not found');
    if (!job.provider_job_id) {
      return { ok: false, errorMessage: 'ComfyUI provider job id가 없습니다.', job: mapVisualizationJob(job), visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
    }
    const settings = mapComfyUiSettings(getComfyUiSettingsRow());
    const download = await downloadComfyUiImages(settings, job.provider_job_id);
    if (download.status === 'FAILED') {
      const failed = saveComfyUiFailedJob(job.id, download.errorMessage || 'ComfyUI 결과 확인 실패', 'DOWNLOAD_IMAGES');
      return { ok: false, providerResult: download, errorMessage: failed.lastError, job: failed, visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
    }
    if (download.status === 'GENERATING') {
      insertComfyUiJobLog({ visualizationJobId: job.id, providerJobId: job.provider_job_id, action: 'POLL_HISTORY', status: 'GENERATING', message: '아직 생성 중입니다.' });
      return { ok: true, providerResult: download, job: mapVisualizationJob(job), visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
    }
    fs.mkdirSync(visualizationExportDir, { recursive: true });
    const first = download.downloads[0];
    const filePath = path.join(visualizationExportDir, `visualization_${job.id}_${Date.now()}.png`);
    fs.writeFileSync(filePath, first.bytes);
    db.project.prepare('UPDATE visualization_jobs SET status = ?, output_path = ?, completed_at = ?, error_message = NULL, last_error = NULL WHERE id = ?').run('COMPLETED', filePath, nowIso(), job.id);
    const attached = attachVisualizationResult({ jobId: job.id, imagePath: filePath, resultType: job.prompt_type, status: 'PENDING_REVIEW' });
    insertComfyUiJobLog({ visualizationJobId: job.id, providerJobId: job.provider_job_id, action: 'DOWNLOAD_IMAGES', status: 'COMPLETED', message: filePath });
    return { ok: true, providerResult: download, result: attached.result, job: mapVisualizationJob(db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(job.id)), visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
  }

  function attachVisualizationResult(payload = {}) {
    const createdAt = nowIso();
    if (!payload.jobId) throw new Error('jobId is required');
    const job = db.project.prepare('SELECT * FROM visualization_jobs WHERE id = ?').get(payload.jobId);
    if (!job) throw new Error('visualization job not found');
    const resultId = payload.resultId || `VIS-RESULT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.project.prepare(`
      INSERT INTO visualization_results (
        id, job_id, brief_id, image_path, thumbnail_path, result_type, status,
        review_note, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resultId,
      payload.jobId,
      job.brief_id,
      String(payload.imagePath || payload.image_path || 'MANUAL_IMAGE_PATH_REQUIRED'),
      payload.thumbnailPath || null,
      String(payload.resultType || job.prompt_type || 'PERSPECTIVE').toUpperCase(),
      String(payload.status || 'PENDING_REVIEW'),
      String(payload.reviewNote || ''),
      null,
      createdAt
    );
    db.project.prepare('UPDATE visualization_jobs SET status = ?, completed_at = ? WHERE id = ?').run('COMPLETED', createdAt, payload.jobId);
    return { resultId, result: mapVisualizationResult(db.project.prepare('SELECT * FROM visualization_results WHERE id = ?').get(resultId)), visualizationData: getAIVisualizationCenterData({ briefId: job.brief_id }) };
  }

  function decideVisualizationResult(payload = {}) {
    const decidedAt = nowIso();
    if (!payload.resultId) throw new Error('resultId is required');
    const action = String(payload.action || '').toUpperCase();
    const statusMap = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      REQUEST_REVISION: 'REVISION_REQUIRED',
      SET_PROPOSAL: 'APPROVED'
    };
    const status = statusMap[action];
    if (!status) throw new Error('Unsupported visualization review action');
    const result = db.project.prepare('SELECT * FROM visualization_results WHERE id = ?').get(payload.resultId);
    if (!result) throw new Error('visualization result not found');
    const nextType = action === 'SET_PROPOSAL' ? 'PROPOSAL' : result.result_type;
    db.project.prepare(`
      UPDATE visualization_results
      SET status = ?, review_note = ?, approved_at = ?, result_type = ?
      WHERE id = ?
    `).run(status, String(payload.reviewNote || ''), status === 'APPROVED' ? decidedAt : null, nextType, payload.resultId);
    insertNotification({ level: status === 'REJECTED' ? 'WARNING' : 'INFO', messageKo: `AI 이미지 검토 처리: ${status}`, relatedProjectId: result.brief_id, actionKo: '이미지 검토', createdAt: decidedAt });
    return { resultId: payload.resultId, result: mapVisualizationResult(db.project.prepare('SELECT * FROM visualization_results WHERE id = ?').get(payload.resultId)), visualizationData: getAIVisualizationCenterData({ briefId: result.brief_id }) };
  }

  function getAIVisualizationCenterData({ briefId = null, floorplanId = null, estimateId = null } = {}) {
    let briefs = [];
    if (briefId) briefs = db.project.prepare('SELECT * FROM visualization_briefs WHERE id = ? ORDER BY updated_at DESC').all(briefId);
    else if (floorplanId) briefs = db.project.prepare('SELECT * FROM visualization_briefs WHERE floorplan_id = ? ORDER BY updated_at DESC').all(floorplanId);
    else if (estimateId) briefs = db.project.prepare('SELECT * FROM visualization_briefs WHERE estimate_id = ? ORDER BY updated_at DESC').all(estimateId);
    else briefs = db.project.prepare('SELECT * FROM visualization_briefs ORDER BY updated_at DESC LIMIT 30').all();
    const mappedBriefs = briefs.map(mapVisualizationBrief);
    const briefIds = mappedBriefs.map((brief) => brief.id);
    const jobs = briefIds.length
      ? db.project.prepare(`SELECT * FROM visualization_jobs WHERE brief_id IN (${briefIds.map(() => '?').join(',')}) ORDER BY requested_at DESC`).all(...briefIds).map(mapVisualizationJob)
      : [];
    const results = briefIds.length
      ? db.project.prepare(`SELECT * FROM visualization_results WHERE brief_id IN (${briefIds.map(() => '?').join(',')}) ORDER BY created_at DESC`).all(...briefIds).map(mapVisualizationResult)
      : [];
    return {
      briefs: mappedBriefs,
      activeBrief: mappedBriefs[0] || null,
      jobs,
      results,
      stats: {
        queued: jobs.filter((job) => job.status === 'QUEUED').length,
        generating: jobs.filter((job) => job.status === 'GENERATING').length,
        failed: jobs.filter((job) => job.status === 'FAILED').length,
        completed: jobs.filter((job) => job.status === 'COMPLETED').length,
        pendingReview: results.filter((result) => result.status === 'PENDING_REVIEW').length,
        approved: results.filter((result) => result.status === 'APPROVED').length,
        revisionRequired: results.filter((result) => result.status === 'REVISION_REQUIRED').length
      },
      comfyUi: getComfyUiSettingsData(),
      floorplanCenterData: getFloorplanCenterData({ floorplanId, estimateId }),
      emptyState: mappedBriefs.length === 0
    };
  }

  function mapDesignBoardTemplate(row) {
    if (!row) return null;
    return {
      id: row.id,
      templateName: row.template_name,
      typography: fromJson(row.typography_json, {}),
      spacing: fromJson(row.spacing_json, {}),
      gridStyle: row.grid_style,
      imageRatio: row.image_ratio,
      sectionOrdering: fromJson(row.section_ordering_json, []),
      backgroundStyle: row.background_style,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapDesignBoard(row) {
    if (!row) return null;
    return {
      id: row.id,
      boardType: row.board_type,
      title: row.title,
      subtitle: row.subtitle,
      projectId: row.project_id,
      estimateId: row.estimate_id,
      projectName: row.project_name,
      templateId: row.template_id,
      boardLayout: fromJson(row.board_layout_json, {}),
      exportPath: row.export_path,
      status: row.status,
      printFormat: row.print_format,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapDesignBoardSection(row) {
    if (!row) return null;
    return {
      id: row.id,
      boardId: row.board_id,
      sectionType: row.section_type,
      sectionTitle: row.section_title,
      sortOrder: row.sort_order,
      content: fromJson(row.content_json, {}),
      createdAt: row.created_at
    };
  }

  function mapPortfolioCandidate(row) {
    if (!row) return null;
    return {
      id: row.id,
      boardId: row.board_id,
      projectId: row.project_id,
      featuredProject: row.featured_project,
      featuredSpace: row.featured_space,
      featuredImage: row.featured_image,
      finalMarginRate: row.final_margin_rate,
      completionQuality: row.completion_quality,
      clientClaims: row.client_claims,
      defectStatus: row.defect_status,
      recommendationStatus: row.recommendation_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function getApprovedVisualizationResults({ estimateId = null, briefId = null } = {}) {
    if (briefId) {
      return db.project.prepare(`
        SELECT *
        FROM visualization_results
        WHERE brief_id = ? AND (status = 'APPROVED' OR result_type = 'PROPOSAL')
        ORDER BY COALESCE(approved_at, created_at) DESC
        LIMIT 30
      `).all(briefId).map(mapVisualizationResult);
    }
    if (estimateId) {
      return db.project.prepare(`
        SELECT vr.*
        FROM visualization_results vr
        JOIN visualization_briefs vb ON vb.id = vr.brief_id
        WHERE vb.estimate_id = ? AND (vr.status = 'APPROVED' OR vr.result_type = 'PROPOSAL')
        ORDER BY COALESCE(vr.approved_at, vr.created_at) DESC
        LIMIT 30
      `).all(estimateId).map(mapVisualizationResult);
    }
    return db.project.prepare(`
      SELECT *
      FROM visualization_results
      WHERE status = 'APPROVED' OR result_type = 'PROPOSAL'
      ORDER BY COALESCE(approved_at, created_at) DESC
      LIMIT 30
    `).all().map(mapVisualizationResult);
  }

  function getDesignBoardTemplates() {
    seedDesignBoardTemplates();
    return db.project.prepare('SELECT * FROM design_board_templates WHERE is_active = 1 ORDER BY template_name').all().map(mapDesignBoardTemplate);
  }

  function buildEstimateSummaryFromSpaces(summaries = [], payloadSummary = {}) {
    const totalAmount = summaries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalCost = summaries.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    return {
      totalAmount: Number(payloadSummary.totalAmount ?? totalAmount),
      totalCost: Number(payloadSummary.totalCost ?? totalCost),
      scheduleDays: Number(payloadSummary.scheduleDays || 0),
      processGroups: payloadSummary.processGroups || summaries.map((item) => ({
        processKo: item.spaceName,
        amount: item.amount,
        cost: item.cost,
        margin: item.margin
      }))
    };
  }

  function getBoardGenerationCenterData({ boardId = null, estimateId = null, projectId = null } = {}) {
    seedDesignBoardTemplates();
    let boards;
    if (boardId) boards = db.project.prepare('SELECT * FROM design_boards WHERE id = ? ORDER BY updated_at DESC').all(boardId);
    else if (estimateId) boards = db.project.prepare('SELECT * FROM design_boards WHERE estimate_id = ? ORDER BY updated_at DESC LIMIT 30').all(estimateId);
    else if (projectId) boards = db.project.prepare('SELECT * FROM design_boards WHERE project_id = ? ORDER BY updated_at DESC LIMIT 30').all(projectId);
    else boards = db.project.prepare('SELECT * FROM design_boards ORDER BY updated_at DESC LIMIT 30').all();

    const mappedBoards = boards.map(mapDesignBoard);
    const activeBoard = mappedBoards[0] || null;
    const sections = activeBoard
      ? db.project.prepare('SELECT * FROM design_board_sections WHERE board_id = ? ORDER BY sort_order').all(activeBoard.id).map(mapDesignBoardSection)
      : [];
    const approvedImages = getApprovedVisualizationResults({ estimateId });
    const portfolioCandidates = db.project.prepare('SELECT * FROM portfolio_candidates ORDER BY updated_at DESC LIMIT 30').all().map(mapPortfolioCandidate);
    return {
      templates: getDesignBoardTemplates(),
      boards: mappedBoards,
      activeBoard,
      activeSections: sections,
      approvedImages,
      portfolioCandidates,
      stats: {
        boardCount: mappedBoards.length,
        approvedImageCount: approvedImages.length,
        portfolioCandidateCount: portfolioCandidates.length,
        exportedBoardCount: mappedBoards.filter((board) => Boolean(board.exportPath)).length
      },
      emptyState: mappedBoards.length === 0
    };
  }

  function createDesignBoard(payload = {}) {
    seedDesignBoardTemplates();
    const createdAt = nowIso();
    const boardId = payload.boardId || `BOARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const boardType = String(payload.boardType || 'CLIENT_PROPOSAL').toUpperCase();
    const templateId = payload.templateId || 'TPL-PREMIUM-MINIMAL';
    const selectedImageIds = Array.isArray(payload.selectedImageIds) ? payload.selectedImageIds : [];
    const autoUseApprovedImages = payload.useApprovedImages !== false;
    const selectedImages = selectedImageIds.length
      ? db.project.prepare(`SELECT * FROM visualization_results WHERE id IN (${selectedImageIds.map(() => '?').join(',')})`).all(...selectedImageIds).map(mapVisualizationResult)
      : autoUseApprovedImages
        ? getApprovedVisualizationResults({ estimateId: payload.estimateId }).slice(0, 6)
        : [];
    const manualImages = (payload.manualImages || [])
      .filter((image) => image && image.imagePath)
      .map((image, index) => ({
        id: image.id || `MANUAL-IMAGE-${index + 1}`,
        imagePath: String(image.imagePath),
        resultType: String(image.resultType || 'PERSPECTIVE').toUpperCase(),
        status: image.status || 'APPROVED'
      }));
    const images = [...selectedImages, ...manualImages];
    const floorplanRow = payload.floorplanId
      ? db.project.prepare('SELECT * FROM floorplans WHERE id = ?').get(payload.floorplanId)
      : db.project.prepare('SELECT * FROM floorplans ORDER BY created_at DESC LIMIT 1').get();
    const floorplan = mapFloorplan(floorplanRow);
    const spaces = floorplan
      ? db.project.prepare('SELECT * FROM floorplan_spaces WHERE floorplan_id = ? ORDER BY created_at').all(floorplan.id).map(mapFloorplanSpace)
      : [];
    const spaceLinks = spaces.length
      ? db.project.prepare(`SELECT * FROM space_estimate_links WHERE space_id IN (${spaces.map(() => '?').join(',')})`).all(...spaces.map((space) => space.id)).map(mapSpaceEstimateLink)
      : [];
    const spaceMap = new Map(spaces.map((space) => [space.id, space]));
    const summaries = buildSpaceSummary(spaceLinks).map((summary) => ({
      ...summary,
      spaceName: spaceMap.get(summary.spaceId)?.spaceName || summary.spaceId
    }));
    const moodboardRow = payload.moodboardId
      ? db.project.prepare('SELECT * FROM moodboard_profiles WHERE id = ?').get(payload.moodboardId)
      : floorplan
        ? db.project.prepare('SELECT * FROM moodboard_profiles WHERE floorplan_id = ? ORDER BY updated_at DESC LIMIT 1').get(floorplan.id)
        : null;
    const moodboard = moodboardRow ? {
      style: moodboardRow.style,
      colorTone: moodboardRow.color_tone,
      primaryMaterials: moodboardRow.primary_materials,
      lightingMood: moodboardRow.lighting_mood
    } : {};
    const estimateSummary = buildEstimateSummaryFromSpaces(summaries, payload.estimateSummary || {});
    const title = payload.title || (boardType === 'PORTFOLIO_BOARD' ? 'ECOREAN Portfolio Board' : 'ECOREAN Interior Proposal');
    const subtitle = payload.subtitle || (boardType === 'MATERIAL_BOARD' ? 'Material Selection Board' : 'Premium Interior Presentation');
    const projectName = payload.projectName || floorplan?.fileName || 'ECOREAN Project';
    const layout = buildBoardLayout({
      boardType,
      exportMode: payload.exportMode || boardType,
      templateId,
      images,
      spaces,
      floorplan,
      moodboard,
      estimateSummary,
      areaM2: payload.areaM2,
      spaceTypeKo: payload.spaceTypeKo,
      projectName,
      title,
      subtitle,
      materialSelections: payload.materialSelections || [],
      constructionScope: payload.constructionScope || [],
      imageFitMode: payload.imageFitMode || 'CONTAIN',
      printFormat: payload.printFormat || 'A3_LANDSCAPE'
    });
    db.project.prepare(`
      INSERT INTO design_boards (
        id, board_type, title, subtitle, project_id, estimate_id, project_name,
        template_id, board_layout_json, export_path, status, print_format, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      boardId,
      boardType,
      title,
      subtitle,
      payload.projectId || null,
      payload.estimateId || null,
      projectName,
      templateId,
      toJson(layout),
      null,
      payload.status || 'DRAFT',
      layout.printSettings.format,
      createdAt,
      createdAt
    );
    const insertSection = db.project.prepare(`
      INSERT INTO design_board_sections (
        id, board_id, section_type, section_title, sort_order, content_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    layout.sections.forEach((section) => {
      insertSection.run(`${boardId}-${section.id}`, boardId, section.sectionType, section.titleKo, section.sortOrder, toJson(section), createdAt);
    });
    insertNotification({ level: 'INFO', messageKo: `디자인 보드 생성: ${title}`, relatedProjectId: payload.projectId || payload.estimateId || boardId, actionKo: '보드 생성', createdAt });
    return { boardId, board: mapDesignBoard(db.project.prepare('SELECT * FROM design_boards WHERE id = ?').get(boardId)), layout, boardData: getBoardGenerationCenterData({ boardId }) };
  }

  function exportDesignBoardPdf(payload = {}) {
    if (!payload.boardId) throw new Error('boardId is required');
    const row = db.project.prepare('SELECT * FROM design_boards WHERE id = ?').get(payload.boardId);
    if (!row) throw new Error('design board not found');
    const board = mapDesignBoard(row);
    const layout = board.boardLayout;
    const exported = exportBoardPdf({ board, layout, exportDir: boardExportDir, timestamp: Date.now(), exportMode: payload.exportMode });
    const updatedAt = nowIso();
    db.project.prepare('UPDATE design_boards SET export_path = ?, status = ?, updated_at = ? WHERE id = ?').run(exported.filePath, 'EXPORTED', updatedAt, payload.boardId);
    insertNotification({ level: 'INFO', messageKo: `디자인 보드 PDF 출력: ${exported.fileName}`, relatedProjectId: board.projectId || board.estimateId || board.id, actionKo: 'PDF 출력', createdAt: updatedAt });
    return { ...exported, board: mapDesignBoard(db.project.prepare('SELECT * FROM design_boards WHERE id = ?').get(payload.boardId)), boardData: getBoardGenerationCenterData({ boardId: payload.boardId }) };
  }

  function createPortfolioCandidate(payload = {}) {
    const createdAt = nowIso();
    const candidateId = payload.candidateId || `PORT-CAND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const board = payload.boardId ? mapDesignBoard(db.project.prepare('SELECT * FROM design_boards WHERE id = ?').get(payload.boardId)) : null;
    const recommended = shouldRecommendPortfolioCandidate({
      finalMarginRate: payload.finalMarginRate,
      hasMajorDefect: payload.hasMajorDefect,
      hasSevereClientComplaint: payload.hasSevereClientComplaint
    });
    db.project.prepare(`
      INSERT INTO portfolio_candidates (
        id, board_id, project_id, featured_project, featured_space, featured_image,
        final_margin_rate, completion_quality, client_claims, defect_status,
        recommendation_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      candidateId,
      payload.boardId || null,
      payload.projectId || board?.projectId || null,
      String(payload.featuredProject || board?.projectName || 'ECOREAN Project'),
      String(payload.featuredSpace || '대표 공간'),
      String(payload.featuredImage || board?.boardLayout?.imagePlacements?.[0]?.imagePath || '이미지 미지정'),
      Number(payload.finalMarginRate || 0),
      String(payload.completionQuality || 'GOOD'),
      String(payload.clientClaims || (payload.hasSevereClientComplaint ? 'SEVERE_CLAIM' : 'NONE')),
      String(payload.defectStatus || (payload.hasMajorDefect ? 'MAJOR_DEFECT' : 'NONE')),
      recommended ? 'RECOMMENDED' : 'REVIEW_REQUIRED',
      createdAt,
      createdAt
    );
    return { candidateId, recommended, candidate: mapPortfolioCandidate(db.project.prepare('SELECT * FROM portfolio_candidates WHERE id = ?').get(candidateId)), boardData: getBoardGenerationCenterData({ boardId: payload.boardId }) };
  }

  function getAiEstimateContext(projectType = 'bathroom_remodel') {
    const templates = db.project.prepare(`
      SELECT *
      FROM profit_templates
      WHERE project_type = ?
      ORDER BY margin DESC, created_at DESC
      LIMIT 20
    `).all(projectType).map((row) => ({
      ...row,
      costStructure: fromJson(row.cost_structure_json, {}),
      crewStructure: fromJson(row.crew_structure_json, {}),
      scheduleStructure: fromJson(row.schedule_structure_json, {}),
      rootCauseSummary: fromJson(row.root_cause_summary_json, []),
      preventionRulesApplied: fromJson(row.prevention_rules_applied_json, [])
    }));
    const calibrationRules = db.project.prepare(`
      SELECT *
      FROM estimate_calibration_rules
      WHERE status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 30
    `).all();
    const preventionRules = db.project.prepare(`
      SELECT *
      FROM prevention_rules
      WHERE status = 'ACTIVE'
        AND project_type IN (?, 'all', 'bathroom_remodel')
      ORDER BY CASE enforcement_level WHEN 'MANDATORY' THEN 0 ELSE 1 END, updated_at DESC
      LIMIT 30
    `).all(projectType);
    const costLeaks = db.project.prepare(`
      SELECT *
      FROM project_closing_cost_leaks
      ORDER BY created_at DESC
      LIMIT 80
    `).all();
    const defectHistory = db.project.prepare(`
      SELECT *
      FROM defect_reports
      ORDER BY created_at DESC
      LIMIT 50
    `).all();
    return { templates, calibrationRules, preventionRules, costLeaks, defectHistory };
  }

  function persistAiEstimateIntelligence(estimateId, intelligence, createdAt = nowIso()) {
    db.project.prepare('DELETE FROM ai_estimate_recommendations WHERE estimate_id = ?').run(estimateId);
    db.project.prepare('DELETE FROM ai_estimate_warnings WHERE estimate_id = ?').run(estimateId);
    const insertRecommendation = db.project.prepare(`
      INSERT INTO ai_estimate_recommendations (
        id, estimate_id, recommendation_type, severity, title, description,
        suggested_action, status, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    intelligence.recommendations.forEach((item, index) => {
      insertRecommendation.run(
        `AIR-${estimateId}-${String(index + 1).padStart(3, '0')}`,
        estimateId,
        item.recommendationType || 'GENERAL',
        item.severity || 'YELLOW',
        item.titleKo || item.title || 'AI 견적 추천',
        item.descriptionKo || item.description || '',
        item.suggestedActionKo || item.suggested_action || '',
        'PENDING',
        toJson(item),
        createdAt,
        createdAt
      );
    });
    const insertWarning = db.project.prepare(`
      INSERT INTO ai_estimate_warnings (
        id, estimate_id, warning_type, severity, title, description,
        suggested_action, status, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    intelligence.warnings.forEach((item, index) => {
      insertWarning.run(
        `AIW-${estimateId}-${String(index + 1).padStart(3, '0')}`,
        estimateId,
        item.warningType || 'MISSING_ITEM',
        item.severity || 'YELLOW',
        item.titleKo || item.title || '누락 위험',
        item.descriptionKo || item.description || '',
        item.suggestedActionKo || item.suggested_action || '',
        'PENDING',
        toJson(item),
        createdAt,
        createdAt
      );
    });
    db.project.prepare(`
      INSERT OR REPLACE INTO ai_estimate_risk_scores (
        id, estimate_id, margin_risk, defect_risk, cost_leak_risk,
        risk_score_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM ai_estimate_risk_scores WHERE id = ?), ?), ?)
    `).run(
      `AIRS-${estimateId}`,
      estimateId,
      intelligence.riskScore.marginRisk.level,
      intelligence.riskScore.defectRisk.level,
      intelligence.riskScore.costLeakRisk.level,
      toJson(intelligence.riskScore),
      `AIRS-${estimateId}`,
      createdAt,
      createdAt
    );
  }

  function getAiEstimateIntelligence({ estimateId = null, input = {}, persist = true } = {}) {
    const createdAt = nowIso();
    const id = estimateId || `AI-EST-${Date.now()}`;
    const projectType = String(input.constructionType || 'bathroom_remodel');
    const preview = projectType === 'full_remodel'
      ? calculateFullRemodelingEstimatePreview({ ...input, estimateId: id })
      : projectType === 'kitchen_remodel'
        ? calculateKitchenEstimatePreview({ ...input, estimateId: id })
        : calculateBathroomEstimatePreview({ ...input, estimateId: id });
    const context = getAiEstimateContext(projectType);
    const intelligence = buildEstimateIntelligence({
      estimateId: id,
      input,
      estimate: preview.estimate,
      ...context
    });
    if (persist) persistAiEstimateIntelligence(id, intelligence, createdAt);
    return {
      estimateId: id,
      preview,
      ...intelligence
    };
  }

  function decideAiRecommendationAction({ estimateId, recommendationId, actionType, actor = 'CEO', reasonKo = '' }) {
    if (!estimateId || !recommendationId || !actionType) throw new Error('estimateId, recommendationId, and actionType are required.');
    const createdAt = nowIso();
    const status = actionType === 'APPLY' ? 'APPLIED' : actionType === 'IGNORE' ? 'IGNORED' : 'PENDING';
    db.project.prepare(`
      UPDATE ai_estimate_recommendations
      SET status = ?, updated_at = ?
      WHERE estimate_id = ? AND id = ?
    `).run(status, createdAt, estimateId, recommendationId);
    db.project.prepare(`
      UPDATE ai_estimate_warnings
      SET status = ?, updated_at = ?
      WHERE estimate_id = ? AND id = ?
    `).run(status, createdAt, estimateId, recommendationId);
    db.project.prepare(`
      INSERT INTO ai_recommendation_actions (
        id, estimate_id, recommendation_id, action_type, actor, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`AIA-${estimateId}-${Date.now()}`, estimateId, recommendationId, actionType, actor, reasonKo || `${actionType} 처리`, createdAt);
    insertNotification({
      level: actionType === 'IGNORE' ? 'WARNING' : 'INFO',
      messageKo: `AI 견적 추천 ${actionType}: ${recommendationId}`,
      relatedProjectId: estimateId,
      actionKo: 'AI Estimate Intelligence',
      createdAt
    });
    return {
      estimateId,
      recommendationId,
      actionType,
      status,
      actionLog: db.project.prepare('SELECT * FROM ai_recommendation_actions WHERE estimate_id = ? ORDER BY created_at DESC LIMIT 20').all(estimateId)
    };
  }

  function getStoredBathroomEstimateModel(estimateId) {
    if (!estimateId) throw new Error('estimateId is required');
    const estimateRow = db.project.prepare('SELECT * FROM bathroom_estimates WHERE id = ?').get(estimateId);
    if (!estimateRow) throw new Error(`Bathroom estimate not found: ${estimateId}`);
    const itemRows = db.project.prepare(`
      SELECT * FROM bathroom_estimate_items
      WHERE estimate_id = ?
      ORDER BY id ASC
    `).all(estimateId);
    return {
      estimate: {
        id: estimateRow.id,
        customerName: estimateRow.customer_name,
        siteName: estimateRow.site_name,
        bathroomCount: estimateRow.bathroom_count,
        bathroomAreaM2: estimateRow.bathroom_area_m2,
        ceilingHeightMm: estimateRow.ceiling_height_mm,
        constructionMethod: estimateRow.construction_method,
        waterproofMethod: estimateRow.waterproof_method,
        tileWallType: estimateRow.tile_wall_type,
        tileFloorType: estimateRow.tile_floor_type,
        options: fromJson(estimateRow.options_json, {}),
        revenue: estimateRow.revenue,
        totalCost: estimateRow.total_cost,
        expectedMargin: estimateRow.expected_margin,
        expectedMarginRate: estimateRow.expected_margin_rate,
        pceDecision: estimateRow.pce_decision,
        createdAt: estimateRow.created_at,
        updatedAt: estimateRow.updated_at
      },
      items: itemRows.map((row) => ({
        id: row.id,
        category: row.category,
        itemName: row.item_name,
        quantity: row.quantity,
        unit: row.unit,
        customerUnitPrice: row.customer_unit_price,
        customerTotal: row.customer_total,
        materialCost: row.material_cost,
        laborCost: row.labor_cost,
        subcontractCost: row.subcontract_cost,
        internalTotal: row.internal_total,
        margin: row.margin,
        marginRate: row.margin_rate
      }))
    };
  }

  function formatWon(value) {
    const amount = Number(value || 0);
    return amount > 0 ? `${amount.toLocaleString('ko-KR')}원` : '금액 확인 필요';
  }

  function ensureCommunicationTemplates(createdAt = nowIso()) {
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO communication_templates (
        id, template_type, title, body_template, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    defaultCommunicationTemplates().forEach((template) => {
      insert.run(
        `COMM-TPL-${template.templateType}`,
        template.templateType,
        template.title,
        template.bodyTemplate,
        1,
        createdAt,
        createdAt
      );
    });
  }

  function communicationTemplateFor(messageType) {
    ensureCommunicationTemplates();
    const row = db.project.prepare('SELECT * FROM communication_templates WHERE template_type = ? AND is_active = 1').get(messageType);
    if (!row) return null;
    return {
      templateType: row.template_type,
      title: row.title,
      bodyTemplate: row.body_template
    };
  }

  function communicationDataFromEntity({ messageType, relatedEntityType, relatedEntityId, fallbackData = {} }) {
    const data = {
      customerName: fallbackData.customerName || '고객명 확인 필요',
      siteName: fallbackData.siteName || '현장명 확인 필요',
      vendorName: fallbackData.vendorName || '협력업체',
      amountKo: fallbackData.amountKo || '금액 확인 필요',
      paymentTerms: fallbackData.paymentTerms || '결제 조건 확인 필요',
      scheduleKo: fallbackData.scheduleKo || '일정 확인 필요',
      processSummaryKo: fallbackData.processSummaryKo || '공정 정보 확인 필요',
      itemSummaryKo: fallbackData.itemSummaryKo || '품목 확인 필요',
      requiredDate: fallbackData.requiredDate || '필요일 확인 필요',
      dueDate: fallbackData.dueDate || '기한 확인 필요',
      notesKo: fallbackData.notesKo || '특이사항 없음',
      nextActionKo: fallbackData.nextActionKo || '확인 후 진행',
      changeContentKo: fallbackData.changeContentKo || '변경 내용 확인 필요',
      changeReasonKo: fallbackData.changeReasonKo || '변경 사유 확인 필요',
      scheduleImpactKo: fallbackData.scheduleImpactKo || '일정 영향 확인 필요',
      inspectionResultKo: fallbackData.inspectionResultKo || '검수 결과 확인 필요',
      defectLocationKo: fallbackData.defectLocationKo || '하자 위치 확인 필요',
      defectTypeKo: fallbackData.defectTypeKo || '하자 유형 확인 필요',
      completedAt: fallbackData.completedAt || '완료일 확인 필요',
      sourceModuleKo: fallbackData.sourceModuleKo || 'BOC',
      ...fallbackData
    };

    if (relatedEntityType === 'Estimate' || messageType === 'CLIENT_ESTIMATE_NOTICE') {
      const row = db.project.prepare('SELECT * FROM bathroom_estimates WHERE id = ?').get(relatedEntityId);
      if (row) {
        data.customerName = row.customer_name;
        data.siteName = row.site_name;
        data.amountKo = formatWon(row.revenue);
        data.notesKo = `PCE 결과: ${row.pce_decision}`;
      }
    }

    if (relatedEntityType === 'Contract' || messageType === 'CLIENT_CONTRACT_NOTICE') {
      const row = db.project.prepare('SELECT * FROM contracts WHERE contract_id = ? OR contract_number = ?').get(relatedEntityId, relatedEntityId);
      if (row) {
        data.customerName = row.customer_name || data.customerName;
        data.siteName = row.site_name || data.siteName;
        data.amountKo = formatWon(row.contract_amount);
        data.paymentTerms = row.payment_terms || `계약금 ${formatWon(row.deposit_amount)} / 중도금 ${formatWon(row.progress_payment_amount)} / 잔금 ${formatWon(row.balance_amount)}`;
        data.scheduleKo = `${row.start_date || '시작일 확인'} ~ ${row.end_date || '완료일 확인'} (${row.duration_days || '기간 확인'}일)`;
      }
    }

    if (relatedEntityType === 'Schedule' || messageType === 'CLIENT_SCHEDULE_NOTICE') {
      const row = db.project.prepare('SELECT * FROM construction_schedules WHERE id = ?').get(relatedEntityId);
      const items = db.project.prepare('SELECT process_name FROM construction_schedule_items WHERE schedule_id = ? ORDER BY sort_order LIMIT 8').all(relatedEntityId);
      if (row) {
        data.siteName = row.schedule_name || data.siteName;
        data.scheduleKo = `${row.start_date} ~ ${row.end_date} (${row.duration_days}일)`;
        data.processSummaryKo = items.map((item) => item.process_name).join(' → ') || data.processSummaryKo;
      }
    }

    if (relatedEntityType === 'PurchaseOrder' || messageType.startsWith('VENDOR_')) {
      const row = db.project.prepare('SELECT * FROM purchase_orders WHERE purchase_order_id = ? OR order_number = ?').get(relatedEntityId, relatedEntityId);
      const items = db.project.prepare('SELECT item_name, quantity, unit FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY id LIMIT 8').all(relatedEntityId);
      if (row) {
        data.vendorName = row.supplier_name || data.vendorName;
        data.purchaseOrderId = row.purchase_order_id || row.order_number;
        data.siteName = row.project_id || data.siteName;
        data.amountKo = formatWon(row.total_amount);
        data.requiredDate = row.required_date || data.requiredDate;
        data.itemSummaryKo = items.map((item) => `${item.item_name} ${item.quantity}${item.unit}`).join(', ') || data.itemSummaryKo;
        data.notesKo = row.unknown_price_warning ? '실제 공급가 확인 필요' : data.notesKo;
      }
    }

    if (relatedEntityType === 'MaterialReceiving' || messageType === 'VENDOR_SHORTAGE_NOTICE') {
      const rows = db.project.prepare('SELECT * FROM material_receiving_logs WHERE purchase_order_id = ? AND missing_quantity > 0').all(relatedEntityId);
      if (rows.length > 0) {
        data.purchaseOrderId = relatedEntityId;
        data.siteName = rows[0].project_id;
        data.vendorName = rows[0].supplier_name_ko || data.vendorName;
        data.itemSummaryKo = rows.map((row) => `${row.item_name_ko} 부족 ${row.missing_quantity}${row.unit}`).join(', ');
        data.notesKo = '발주 수량 대비 입고 부족 발생';
      }
    }

    if (relatedEntityType === 'Inspection' || messageType === 'CLIENT_INSPECTION_RESULT') {
      const row = db.project.prepare('SELECT * FROM inspection_results WHERE inspection_result_id = ?').get(relatedEntityId);
      if (row) {
        data.siteName = row.project_id;
        data.inspectionResultKo = row.result_status === 'FAILED' ? 'FAIL' : 'PASS';
        data.notesKo = row.notes_ko || data.notesKo;
        data.nextActionKo = row.result_status === 'FAILED' ? '보완 조치 후 재검수' : '후속 공정 진행 가능';
      }
    }

    if (relatedEntityType === 'ChangeOrder' || messageType === 'CLIENT_CHANGE_ORDER_APPROVAL') {
      const row = db.project.prepare('SELECT * FROM change_orders WHERE change_order_id = ?').get(relatedEntityId);
      if (row) {
        data.siteName = row.site_name_ko;
        data.changeContentKo = row.change_content_ko;
        data.changeReasonKo = row.change_reason_ko;
        data.amountKo = formatWon(row.additional_amount);
        data.scheduleImpactKo = `${row.schedule_impact_days || 0}일`;
      }
    }

    if (relatedEntityType === 'Defect' || messageType.startsWith('CLIENT_DEFECT')) {
      const row = db.project.prepare('SELECT * FROM defect_reports WHERE defect_id = ?').get(relatedEntityId);
      if (row) {
        data.siteName = row.site_name_ko;
        data.defectLocationKo = row.defect_location_ko;
        data.defectTypeKo = row.defect_type_ko;
        data.amountKo = formatWon(row.estimated_cost);
        data.nextActionKo = row.status === 'COMPLETED' ? '고객 확인 요청' : '처리 일정 안내 예정';
        data.completedAt = row.completed_at || data.completedAt;
      }
    }

    if (relatedEntityType === 'Receivable' || messageType === 'CLIENT_PAYMENT_REQUEST') {
      const row = db.project.prepare('SELECT * FROM receivables WHERE receivable_id = ?').get(relatedEntityId);
      if (row) {
        data.siteName = row.project_id;
        data.amountKo = formatWon(row.amount);
        data.dueDate = row.due_date;
        data.notesKo = row.notes_ko || data.notesKo;
      }
    }

    return data;
  }

  function createCommunicationDraft(payload = {}) {
    ensureCommunicationTemplates();
    const createdAt = payload.createdAt || nowIso();
    const messageType = payload.messageType;
    const relatedEntityType = payload.relatedEntityType || 'UNKNOWN';
    const relatedEntityId = payload.relatedEntityId || 'UNKNOWN';
    const messageId = payload.messageId || `COMM-${messageType}-${relatedEntityId}`;
    const existing = db.project.prepare('SELECT * FROM communication_messages WHERE id = ?').get(messageId);
    if (existing && !payload.force) {
      return { messageId, message: existing, existing: true };
    }

    const template = communicationTemplateFor(messageType);
    const data = communicationDataFromEntity({
      messageType,
      relatedEntityType,
      relatedEntityId,
      fallbackData: payload.data || {}
    });
    const message = buildCommunicationMessage({
      messageType,
      template,
      data,
      targetType: payload.targetType || (messageType.startsWith('VENDOR_') ? 'VENDOR' : messageType.startsWith('INTERNAL_') ? 'INTERNAL' : 'CLIENT'),
      targetName: payload.targetName,
      targetContact: payload.targetContact,
      relatedEntityType,
      relatedEntityId,
      status: payload.status || 'DRAFT'
    });

    db.project.prepare(`
      INSERT OR REPLACE INTO communication_messages (
        id, message_type, target_type, target_name, target_contact,
        related_entity_type, related_entity_id, title, body, status,
        created_at, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM communication_messages WHERE id = ?), ?), ?)
    `).run(
      messageId,
      message.messageType,
      message.targetType,
      message.targetName,
      message.targetContact,
      message.relatedEntityType,
      message.relatedEntityId,
      message.title,
      message.body,
      message.status,
      messageId,
      createdAt,
      null
    );

    insertNotification({
      level: 'INFO',
      messageKo: `커뮤니케이션 초안 생성: ${message.title}`,
      relatedProjectId: relatedEntityId,
      actionKo: '메시지 초안',
      createdAt
    });

    return {
      messageId,
      message: db.project.prepare('SELECT * FROM communication_messages WHERE id = ?').get(messageId),
      existing: false
    };
  }

  function generateCommunicationMessage(payload = {}) {
    return { ...createCommunicationDraft(payload), communicationCenterData: getCommunicationCenterData() };
  }

  function markCommunicationMessageSent({ messageId, channel = 'COPY_MANUAL', actor = 'CEO', resultMessage = '복사 후 발송 완료 처리' }) {
    const createdAt = nowIso();
    const row = db.project.prepare('SELECT * FROM communication_messages WHERE id = ?').get(messageId);
    if (!row) throw new Error(`Communication message not found: ${messageId}`);
    db.project.prepare('UPDATE communication_messages SET status = ?, sent_at = ? WHERE id = ?').run('SENT', createdAt, messageId);
    db.project.prepare(`
      INSERT INTO communication_send_logs (
        id, message_id, channel, status, result_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(`COMMLOG-${messageId}-${Date.now()}`, messageId, channel, 'SENT', resultMessage, createdAt);
    writeOperationalLog({
      actionType: 'MARK_COMMUNICATION_SENT',
      actor,
      projectId: row.related_entity_id,
      messageKo: `발송 완료 처리: ${row.title}`,
      actionKo: '발송 완료',
      level: 'INFO',
      payload: { messageId, channel },
      reasonKo: resultMessage,
      createdAt
    });
    return { messageId, status: 'SENT', communicationCenterData: getCommunicationCenterData() };
  }

  function cancelCommunicationMessage({ messageId, actor = 'CEO', reasonKo = '발송 취소' }) {
    const createdAt = nowIso();
    const row = db.project.prepare('SELECT * FROM communication_messages WHERE id = ?').get(messageId);
    if (!row) throw new Error(`Communication message not found: ${messageId}`);
    db.project.prepare('UPDATE communication_messages SET status = ? WHERE id = ?').run('CANCELLED', messageId);
    db.project.prepare(`
      INSERT INTO communication_send_logs (
        id, message_id, channel, status, result_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(`COMMLOG-${messageId}-${Date.now()}`, messageId, 'SYSTEM', 'CANCELLED', reasonKo, createdAt);
    writeOperationalLog({
      actionType: 'CANCEL_COMMUNICATION',
      actor,
      projectId: row.related_entity_id,
      messageKo: `메시지 취소: ${row.title}`,
      actionKo: '메시지 취소',
      level: 'WARNING',
      payload: { messageId },
      reasonKo,
      createdAt
    });
    return { messageId, status: 'CANCELLED', communicationCenterData: getCommunicationCenterData() };
  }

  function getCommunicationCenterData() {
    ensureCommunicationTemplates();
    const messages = db.project.prepare('SELECT * FROM communication_messages ORDER BY created_at DESC LIMIT 100').all();
    const logs = db.project.prepare('SELECT * FROM communication_send_logs ORDER BY created_at DESC LIMIT 100').all();
    const templates = db.project.prepare('SELECT * FROM communication_templates ORDER BY template_type').all();
    const byStatus = messages.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
    return {
      snapshotDate: new Date().toISOString().slice(0, 10),
      summary: {
        totalMessages: messages.length,
        draftCount: byStatus.DRAFT || 0,
        readyCount: byStatus.READY || 0,
        sentCount: byStatus.SENT || 0,
        failedCount: byStatus.FAILED || 0,
        cancelledCount: byStatus.CANCELLED || 0,
        templateCount: templates.length
      },
      messages,
      sendLogs: logs,
      templates
    };
  }

  function addDaysIso(dateText, days) {
    const base = dateText ? new Date(dateText) : new Date();
    if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  }

  function syncCustomerPaymentScheduleFromContract(contractId, createdAt = nowIso()) {
    const row = db.project.prepare('SELECT * FROM contracts WHERE contract_id = ? OR contract_number = ?').get(contractId, contractId);
    if (!row) return [];
    const startDate = row.start_date || createdAt.slice(0, 10);
    const endDate = row.end_date || addDaysIso(startDate, Number(row.duration_days || 7));
    const progressDate = addDaysIso(startDate, Math.max(1, Math.floor(Number(row.duration_days || 7) / 2)));
    const schedule = [
      { type: 'DEPOSIT', labelKo: '계약금', amount: Number(row.deposit_amount || Math.round(Number(row.contract_amount || 0) * 0.3)), dueDate: startDate },
      { type: 'PROGRESS', labelKo: '중도금', amount: Number(row.progress_payment_amount || Math.round(Number(row.contract_amount || 0) * 0.4)), dueDate: progressDate },
      { type: 'BALANCE', labelKo: '잔금', amount: Number(row.balance_amount || Math.round(Number(row.contract_amount || 0) * 0.3)), dueDate: endDate }
    ];
    const insertPayment = db.project.prepare(`
      INSERT OR IGNORE INTO customer_payments (
        payment_id, contract_id, estimate_id, project_id, customer_name, site_name,
        payment_type, due_date, scheduled_amount, actual_received_date,
        actual_received_amount, payment_status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertReceivable = db.project.prepare(`
      INSERT OR IGNORE INTO receivables (
        receivable_id, project_id, amount, due_date, actual_received_date,
        receivable_status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    schedule.forEach((item) => {
      const paymentId = `CPAY-${row.contract_id}-${item.type}`;
      insertPayment.run(
        paymentId,
        row.contract_id,
        row.estimate_id,
        row.project_id,
        row.customer_name || 'UNKNOWN',
        row.site_name || row.project_id,
        item.type,
        item.dueDate,
        item.amount,
        null,
        0,
        'SCHEDULED',
        item.labelKo,
        createdAt,
        createdAt
      );
      insertReceivable.run(
        `REC-${paymentId}`,
        row.project_id,
        item.amount,
        item.dueDate,
        null,
        'EXPECTED',
        `${item.labelKo} 예정`,
        createdAt,
        createdAt
      );
    });
    return db.project.prepare('SELECT * FROM customer_payments WHERE contract_id = ? ORDER BY due_date').all(row.contract_id);
  }

  function syncVendorPaymentScheduleFromPurchaseOrder(purchaseOrderId, createdAt = nowIso()) {
    const row = db.project.prepare('SELECT * FROM purchase_orders WHERE purchase_order_id = ? OR order_number = ?').get(purchaseOrderId, purchaseOrderId);
    if (!row) return null;
    const paymentId = `VPAY-${row.purchase_order_id}`;
    const dueDate = row.required_date || addDaysIso(createdAt.slice(0, 10), 7);
    const amount = Number(row.total_amount || 0);
    db.project.prepare(`
      INSERT OR IGNORE INTO vendor_payments (
        payment_id, purchase_order_id, contract_id, project_id, vendor_name, site_name,
        due_date, scheduled_amount, actual_paid_date, actual_paid_amount,
        payment_status, approval_status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      row.purchase_order_id,
      row.contract_id,
      row.project_id,
      row.supplier_name || '거래처 미정',
      row.project_id,
      dueDate,
      amount,
      null,
      0,
      'SCHEDULED',
      amount >= 1000000 ? 'PENDING_CEO_APPROVAL' : 'NOT_REQUIRED',
      '발주서 기반 지급 예정',
      createdAt,
      createdAt
    );
    db.project.prepare(`
      INSERT OR IGNORE INTO payables (
        payable_id, project_id, vendor_id, amount, due_date, actual_paid_date,
        payable_status, payable_type, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `PAY-${paymentId}`,
      row.project_id,
      row.supplier_name || 'VENDOR_UNKNOWN',
      amount,
      dueDate,
      null,
      'EXPECTED',
      'VENDOR_PAYMENT',
      '발주서 기반 지급 예정',
      createdAt,
      createdAt
    );
    if (amount >= 1000000) {
      upsertApprovalRequest({
        requestId: `APR-PAY-${paymentId}`,
        sourceModule: 'PAYMENT',
        entityId: paymentId,
        projectId: row.project_id,
        titleKo: '협력업체 지급 승인',
        amount,
        reasonKo: `${row.supplier_name || '거래처'} 지급 예정금액 CEO 승인 필요`,
        status: 'PENDING'
      }, createdAt);
    }
    return db.project.prepare('SELECT * FROM vendor_payments WHERE payment_id = ?').get(paymentId);
  }

  function syncPaymentSchedules(createdAt = nowIso()) {
    db.project.prepare('SELECT * FROM contracts').all().forEach((contract) => {
      syncCustomerPaymentScheduleFromContract(contract.contract_id, createdAt);
    });
    db.project.prepare('SELECT * FROM purchase_orders').all().forEach((purchaseOrder) => {
      syncVendorPaymentScheduleFromPurchaseOrder(purchaseOrder.purchase_order_id, createdAt);
    });
  }

  function updatePaymentOverdues(createdAt = nowIso()) {
    const today = createdAt.slice(0, 10);
    const customerRows = db.project.prepare("SELECT * FROM customer_payments WHERE payment_status NOT IN ('PAID', 'PARTIAL_PAID') AND due_date < ?").all(today);
    customerRows.forEach((row) => {
      const balance = Math.max(0, Number(row.scheduled_amount || 0) - Number(row.actual_received_amount || 0));
      db.project.prepare('UPDATE customer_payments SET payment_status = ?, updated_at = ? WHERE payment_id = ?').run('OVERDUE', createdAt, row.payment_id);
      db.project.prepare("UPDATE receivables SET receivable_status = 'OVERDUE', updated_at = ? WHERE receivable_id = ?").run(createdAt, `REC-${row.payment_id}`);
      db.project.prepare(`
        INSERT OR REPLACE INTO payment_alerts (
          alert_id, payment_id, payment_kind, alert_type, severity, amount,
          due_date, message_ko, status, created_at, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM payment_alerts WHERE alert_id = ?), ?), ?)
      `).run(
        `PAL-CUST-${row.payment_id}`,
        row.payment_id,
        'CUSTOMER',
        'CUSTOMER_OVERDUE',
        balance >= 1000000 ? 'RED' : 'YELLOW',
        balance,
        row.due_date,
        `${row.customer_name} ${row.site_name} ${row.notes_ko} 연체`,
        'ACTIVE',
        `PAL-CUST-${row.payment_id}`,
        createdAt,
        null
      );
      createCommunicationDraft({
        messageType: 'CLIENT_PAYMENT_REQUEST',
        relatedEntityType: 'Receivable',
        relatedEntityId: `REC-${row.payment_id}`,
        targetType: 'CLIENT',
        targetName: row.customer_name,
        status: 'READY',
        createdAt
      });
      if (balance >= 1000000) {
        upsertRedAlertEvent({
          redAlertId: `RED-PAY-CUST-${row.payment_id}`,
          sourceModule: 'Payment',
          entityId: row.payment_id,
          projectId: row.project_id,
          titleKo: '고객 입금 연체',
          reasonKo: `${row.notes_ko} ${balance.toLocaleString('ko-KR')}원 연체`,
          financialImpact: balance,
          blockingRequired: false,
          payload: row
        }, createdAt);
      }
    });

    const vendorRows = db.project.prepare("SELECT * FROM vendor_payments WHERE payment_status NOT IN ('PAID', 'PARTIAL_PAID') AND due_date < ?").all(today);
    vendorRows.forEach((row) => {
      const balance = Math.max(0, Number(row.scheduled_amount || 0) - Number(row.actual_paid_amount || 0));
      db.project.prepare('UPDATE vendor_payments SET payment_status = ?, updated_at = ? WHERE payment_id = ?').run('OVERDUE', createdAt, row.payment_id);
      db.project.prepare("UPDATE payables SET payable_status = 'OVERDUE', updated_at = ? WHERE payable_id = ?").run(createdAt, `PAY-${row.payment_id}`);
      db.project.prepare(`
        INSERT OR REPLACE INTO payment_alerts (
          alert_id, payment_id, payment_kind, alert_type, severity, amount,
          due_date, message_ko, status, created_at, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM payment_alerts WHERE alert_id = ?), ?), ?)
      `).run(
        `PAL-VENDOR-${row.payment_id}`,
        row.payment_id,
        'VENDOR',
        'VENDOR_OVERDUE',
        balance >= 1000000 ? 'RED' : 'ORANGE',
        balance,
        row.due_date,
        `${row.vendor_name} 지급 연체`,
        'ACTIVE',
        `PAL-VENDOR-${row.payment_id}`,
        createdAt,
        null
      );
      upsertCeoDecisionItem({
        decisionId: `CEO-PAY-VENDOR-${row.payment_id}`,
        sourceModule: 'Payment',
        entityType: 'VendorPayment',
        entityId: row.payment_id,
        decisionType: 'VENDOR_PAYMENT_OVERDUE',
        titleKo: '협력업체 지급 연체',
        projectId: row.project_id,
        siteNameKo: row.site_name,
        financialImpact: balance,
        riskLevel: balance >= 1000000 ? 'RED' : 'ORANGE',
        requiredActionKo: '지급 승인/일정 조정',
        deadline: row.due_date,
        payload: row
      }, createdAt);
    });
  }

  function rebuildPaymentCashflowSnapshot(createdAt = nowIso()) {
    syncPaymentSchedules(createdAt);
    updatePaymentOverdues(createdAt);
    return syncCashflowSnapshot(createdAt);
  }

  function markCustomerPaymentReceived({ paymentId, amount, receivedDate = null, actor = 'CEO', notesKo = '입금 처리' }) {
    const createdAt = nowIso();
    const row = db.project.prepare('SELECT * FROM customer_payments WHERE payment_id = ?').get(paymentId);
    if (!row) throw new Error(`Customer payment not found: ${paymentId}`);
    const actualAmount = Number(row.actual_received_amount || 0) + Number(amount || row.scheduled_amount || 0);
    const scheduled = Number(row.scheduled_amount || 0);
    const status = actualAmount >= scheduled ? 'PAID' : 'PARTIAL_PAID';
    const date = receivedDate || createdAt.slice(0, 10);
    db.project.prepare(`
      UPDATE customer_payments
      SET actual_received_date = ?, actual_received_amount = ?, payment_status = ?, notes_ko = ?, updated_at = ?
      WHERE payment_id = ?
    `).run(date, actualAmount, status, notesKo, createdAt, paymentId);
    db.project.prepare(`
      UPDATE receivables
      SET actual_received_date = ?, receivable_status = ?, updated_at = ?
      WHERE receivable_id = ?
    `).run(date, status === 'PAID' ? 'RECEIVED' : 'PARTIAL', createdAt, `REC-${paymentId}`);
    db.project.prepare(`
      INSERT INTO payment_transactions (
        transaction_id, payment_id, payment_kind, transaction_type, amount,
        transaction_date, actor, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`PTR-CUST-${paymentId}-${Date.now()}`, paymentId, 'CUSTOMER', status, Number(amount || scheduled), date, actor, notesKo, createdAt);
    rebuildPaymentCashflowSnapshot(createdAt);
    return { paymentId, status, paymentCenterData: getPaymentCenterData() };
  }

  function markVendorPaymentPaid({ paymentId, amount, paidDate = null, actor = 'CEO', notesKo = '지급 처리' }) {
    const createdAt = nowIso();
    const row = db.project.prepare('SELECT * FROM vendor_payments WHERE payment_id = ?').get(paymentId);
    if (!row) throw new Error(`Vendor payment not found: ${paymentId}`);
    if (row.approval_status === 'PENDING_CEO_APPROVAL') {
      const approval = db.project.prepare('SELECT * FROM approval_requests WHERE request_id = ?').get(`APR-PAY-${paymentId}`);
      if (!approval || approval.status !== 'APPROVED') throw new Error('Vendor payment blocked: CEO approval required.');
    }
    const actualAmount = Number(row.actual_paid_amount || 0) + Number(amount || row.scheduled_amount || 0);
    const scheduled = Number(row.scheduled_amount || 0);
    const status = actualAmount >= scheduled ? 'PAID' : 'PARTIAL_PAID';
    const date = paidDate || createdAt.slice(0, 10);
    db.project.prepare(`
      UPDATE vendor_payments
      SET actual_paid_date = ?, actual_paid_amount = ?, payment_status = ?, notes_ko = ?, updated_at = ?
      WHERE payment_id = ?
    `).run(date, actualAmount, status, notesKo, createdAt, paymentId);
    db.project.prepare(`
      UPDATE payables
      SET actual_paid_date = ?, payable_status = ?, updated_at = ?
      WHERE payable_id = ?
    `).run(date, status === 'PAID' ? 'PAID' : 'PARTIAL', createdAt, `PAY-${paymentId}`);
    db.project.prepare(`
      INSERT INTO payment_transactions (
        transaction_id, payment_id, payment_kind, transaction_type, amount,
        transaction_date, actor, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`PTR-VENDOR-${paymentId}-${Date.now()}`, paymentId, 'VENDOR', status, Number(amount || scheduled), date, actor, notesKo, createdAt);
    rebuildPaymentCashflowSnapshot(createdAt);
    return { paymentId, status, paymentCenterData: getPaymentCenterData() };
  }

  function createPaymentRequestMessage({ paymentId, actor = 'CEO' }) {
    const row = db.project.prepare('SELECT * FROM customer_payments WHERE payment_id = ?').get(paymentId);
    if (!row) throw new Error(`Customer payment not found: ${paymentId}`);
    return generateCommunicationMessage({
      messageType: 'CLIENT_PAYMENT_REQUEST',
      relatedEntityType: 'Receivable',
      relatedEntityId: `REC-${paymentId}`,
      targetType: 'CLIENT',
      targetName: row.customer_name,
      status: 'READY',
      data: { actor }
    });
  }

  function requestVendorPaymentApproval({ paymentId, actor = 'CEO', reasonKo = '협력업체 지급 승인 요청' }) {
    const createdAt = nowIso();
    const row = db.project.prepare('SELECT * FROM vendor_payments WHERE payment_id = ?').get(paymentId);
    if (!row) throw new Error(`Vendor payment not found: ${paymentId}`);
    upsertApprovalRequest({
      requestId: `APR-PAY-${paymentId}`,
      sourceModule: 'PAYMENT',
      entityId: paymentId,
      projectId: row.project_id,
      titleKo: '협력업체 지급 승인',
      amount: row.scheduled_amount,
      reasonKo,
      status: 'PENDING'
    }, createdAt);
    db.project.prepare("UPDATE vendor_payments SET approval_status = 'PENDING_CEO_APPROVAL', updated_at = ? WHERE payment_id = ?").run(createdAt, paymentId);
    return { paymentId, approvalRequestId: `APR-PAY-${paymentId}`, paymentCenterData: getPaymentCenterData() };
  }

  function getPaymentCenterData() {
    const createdAt = nowIso();
    const cashflow = rebuildPaymentCashflowSnapshot(createdAt);
    const customerPayments = db.project.prepare('SELECT * FROM customer_payments ORDER BY due_date, payment_id').all();
    const vendorPayments = db.project.prepare('SELECT * FROM vendor_payments ORDER BY due_date, payment_id').all();
    const transactions = db.project.prepare('SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 100').all();
    const alerts = db.project.prepare('SELECT * FROM payment_alerts ORDER BY created_at DESC LIMIT 100').all();
    const today = createdAt.slice(0, 10);
    const sevenDaysLater = addDaysIso(today, 7);
    const sum = (rows, field, predicate) => rows.filter(predicate).reduce((total, row) => total + Number(row[field] || 0), 0);
    return {
      snapshotDate: today,
      summary: {
        todayExpectedInflow: cashflow?.today_expected_inflow || 0,
        todayActualInflow: cashflow?.today_actual_inflow || 0,
        todayExpectedOutflow: cashflow?.today_expected_outflow || 0,
        todayActualOutflow: cashflow?.today_actual_outflow || 0,
        todayNetCashflow: cashflow?.today_net_cashflow || 0,
        sevenDayExpectedInflow: cashflow?.seven_day_expected_inflow || 0,
        sevenDayExpectedOutflow: cashflow?.seven_day_expected_outflow || 0,
        sevenDayNetCashflow: cashflow?.seven_day_net_cashflow || 0,
        receivableAmount: cashflow?.receivable_amount || 0,
        payableAmount: cashflow?.payable_amount || 0,
        overdueReceivableAmount: sum(customerPayments, 'scheduled_amount', (row) => row.payment_status === 'OVERDUE'),
        overduePayableAmount: sum(vendorPayments, 'scheduled_amount', (row) => row.payment_status === 'OVERDUE'),
        sevenDayCustomerPaymentCount: customerPayments.filter((row) => row.due_date >= today && row.due_date <= sevenDaysLater).length,
        sevenDayVendorPaymentCount: vendorPayments.filter((row) => row.due_date >= today && row.due_date <= sevenDaysLater).length,
        dataStatus: cashflow?.data_status || 'EMPTY',
        displayStatusKo: cashflow?.data_status === 'READY' ? '데이터 있음' : '데이터 없음'
      },
      customerPayments,
      vendorPayments,
      transactions,
      alerts,
      communicationData: getCommunicationCenterData()
    };
  }

  function daysBetween(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  function sumProjectRows(tableName, amountField, projectId, statusClause = '') {
    const sql = `SELECT COALESCE(SUM(${amountField}), 0) AS total FROM ${tableName} WHERE project_id = ? ${statusClause}`;
    return Number(db.project.prepare(sql).get(projectId)?.total || 0);
  }

  function latestClosingContract(projectId) {
    return db.project.prepare(`
      SELECT *
      FROM contracts
      WHERE project_id = ? OR estimate_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `).get(projectId, projectId);
  }

  function latestClosingEstimate(projectId, contract = null) {
    const estimateId = contract?.estimate_id || projectId;
    return db.project.prepare(`
      SELECT *
      FROM bathroom_estimates
      WHERE id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(estimateId);
  }

  function buildProjectClosingBasis(projectId, createdAt = nowIso()) {
    syncPaymentSchedules(createdAt);
    updatePaymentOverdues(createdAt);
    const contract = latestClosingContract(projectId);
    const estimate = latestClosingEstimate(projectId, contract);
    const estimateId = estimate?.id || contract?.estimate_id || projectId;
    const schedule = db.project.prepare(`
      SELECT *
      FROM construction_schedules
      WHERE estimate_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `).get(estimateId);
    const completionReport = db.project.prepare(`
      SELECT *
      FROM project_completion_reports
      WHERE project_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `).get(projectId);
    const actualCost = db.project.prepare(`
      SELECT *
      FROM actual_costs
      WHERE project_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `).get(projectId);
    const siteOperation = db.project.prepare(`
      SELECT *
      FROM site_operations
      WHERE project_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(projectId);
    const itemCost = db.project.prepare(`
      SELECT
        COALESCE(SUM(customer_total), 0) AS customer_total,
        COALESCE(SUM(material_cost), 0) AS material_cost,
        COALESCE(SUM(labor_cost), 0) AS labor_cost,
        COALESCE(SUM(subcontract_cost), 0) AS subcontract_cost,
        COALESCE(SUM(internal_total), 0) AS internal_total
      FROM bathroom_estimate_items
      WHERE estimate_id = ?
    `).get(estimateId);
    const actualLaborFromAttendance = sumProjectRows('crew_attendance_logs', 'labor_cost', projectId);
    const actualCapturedCost = sumProjectRows('cost_capture_entries', 'amount', projectId);
    const poMaterial = db.project.prepare(`
      SELECT COALESCE(SUM(poi.expected_total), 0) AS total
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.purchase_order_id = poi.purchase_order_id
      WHERE po.project_id = ? OR po.estimate_id = ?
    `).get(projectId, estimateId)?.total || 0;
    const changeOrderRevenue = sumProjectRows('change_orders', 'additional_amount', projectId, "AND status IN ('APPROVED', 'REFLECTED', 'COMPLETED')");
    const changeOrderCost = sumProjectRows('change_orders', 'additional_cost', projectId, "AND status IN ('APPROVED', 'REFLECTED', 'COMPLETED')");
    const defectCost = sumProjectRows('defect_reports', 'estimated_cost', projectId);
    const unpaidReceivable = db.project.prepare(`
      SELECT COALESCE(SUM(MAX(scheduled_amount - actual_received_amount, 0)), 0) AS total
      FROM customer_payments
      WHERE project_id = ? AND payment_status NOT IN ('PAID', 'RECEIVED')
    `).get(projectId)?.total || 0;
    const unpaidPayable = db.project.prepare(`
      SELECT COALESCE(SUM(MAX(scheduled_amount - actual_paid_amount, 0)), 0) AS total
      FROM vendor_payments
      WHERE project_id = ? AND payment_status NOT IN ('PAID')
    `).get(projectId)?.total || 0;
    const actualReceivedRevenue = sumProjectRows('customer_payments', 'actual_received_amount', projectId);
    const unresolvedMajorDefects = db.project.prepare(`
      SELECT COUNT(*) AS total
      FROM defect_reports
      WHERE project_id = ?
        AND severity IN ('HIGH', 'CRITICAL')
        AND status NOT IN ('COMPLETED', 'CLOSED', 'RESOLVED')
    `).get(projectId)?.total || 0;

    const estimatedRevenue = Number(contract?.contract_amount || estimate?.revenue || itemCost.customer_total || 0);
    const estimatedCost = Number(estimate?.total_cost || itemCost.internal_total || Math.round(estimatedRevenue * 0.75));
    const estimatedLaborCost = Number(itemCost.labor_cost || Math.round(estimatedCost * 0.35));
    const estimatedMaterialCost = Number(itemCost.material_cost || Math.round(estimatedCost * 0.45));
    const actualLaborCost = Number(actualCost?.labor_cost || actualLaborFromAttendance || 0);
    const actualMaterialCost = Number(actualCost?.material_cost || poMaterial || 0);
    const actualCostTotal = Number(
      actualCost?.total_actual_cost ||
      (actualCapturedCost + actualLaborCost + actualMaterialCost + changeOrderCost + defectCost) ||
      estimatedCost
    );
    const actualRevenue = Number(actualReceivedRevenue || 0);
    const expectedMargin = estimatedRevenue - estimatedCost;
    const actualMargin = actualRevenue - actualCostTotal;
    const expectedMarginRate = estimatedRevenue > 0 ? expectedMargin / estimatedRevenue : 0;
    const actualMarginRate = actualRevenue > 0 ? actualMargin / actualRevenue : 0;
    const plannedStartDate = schedule?.start_date || contract?.start_date || null;
    const plannedEndDate = schedule?.end_date || contract?.end_date || null;
    const actualStartDate = siteOperation?.started_at?.slice(0, 10) || plannedStartDate;
    const actualEndDate = completionReport?.completion_date || createdAt.slice(0, 10);
    const scheduleVarianceDays = Math.max(0, daysBetween(plannedEndDate, actualEndDate));

    let closingStatus = 'READY_TO_CLOSE';
    if (unpaidReceivable > 0) closingStatus = 'BLOCKED_BY_RECEIVABLE';
    else if (unpaidPayable > 0) closingStatus = 'BLOCKED_BY_PAYABLE';
    else if (unresolvedMajorDefects > 0) closingStatus = 'BLOCKED_BY_DEFECT';
    else if (actualMargin < 0) closingStatus = 'CLOSED_LOSS';
    else if (actualMarginRate < 0.25) closingStatus = 'CLOSED_REVIEW_REQUIRED';
    else closingStatus = 'CLOSED_PROFIT';

    return {
      projectId,
      estimateId,
      contractId: contract?.contract_id || null,
      estimatedRevenue,
      actualReceivedRevenue: actualRevenue,
      estimatedCost,
      actualCost: actualCostTotal,
      expectedMargin,
      actualMargin,
      expectedMarginRate,
      actualMarginRate,
      marginVariance: actualMargin - expectedMargin,
      plannedStartDate,
      actualStartDate,
      plannedEndDate,
      actualEndDate,
      scheduleVarianceDays,
      estimatedLaborCost,
      actualLaborCost,
      estimatedMaterialCost,
      actualMaterialCost,
      changeOrderRevenue,
      changeOrderCost,
      defectCost,
      unpaidReceivable: Number(unpaidReceivable || 0),
      unpaidPayable: Number(unpaidPayable || 0),
      unresolvedMajorDefects: Number(unresolvedMajorDefects || 0),
      closingStatus,
      source: { contract, estimate, schedule, completionReport, actualCost }
    };
  }

  const closingLeakPreventionKo = {
    MATERIAL_COST_OVER: '다음 견적에서 자재 단가 버퍼 또는 실공급가 확인을 강제합니다.',
    LABOR_COST_OVER: '다음 견적에서 최소 품수와 작업 생산성 기준을 보정합니다.',
    SUBCONTRACT_COST_OVER: '외주 단가 승인 기준과 최소 마진 방어선을 강화합니다.',
    SCHEDULE_DELAY_COST: '공정표에 지연 버퍼와 검수 차단 규칙을 반영합니다.',
    DEFECT_REWORK_COST: '하자 예방 체크리스트와 검수 포인트를 추가합니다.',
    ESTIMATE_MISSING_ITEM: '누락 비용을 필수 포함 항목으로 추가합니다.',
    CHANGE_ORDER_UNDERPRICED: '추가공사 최소 마진율과 별도 수금 조건을 강제합니다.',
    VENDOR_PRICE_VARIANCE: '거래처 실공급가 검증과 가격 이력 비교를 강화합니다.',
    CLIENT_SCOPE_CHANGE: '고객 범위 변경 승인서와 수금 조건을 강화합니다.',
    UNKNOWN: '대표 검토 후 원인 분류가 필요합니다.'
  };

  function pushClosingLeak(leaks, snapshot, category, estimatedAmount, actualAmount, rootCause = null) {
    const estimated = Math.round(Number(estimatedAmount || 0));
    const actual = Math.round(Number(actualAmount || 0));
    const variance = actual - estimated;
    if (variance <= 0) return;
    leaks.push({
      leakId: `PCL-${snapshot.projectId}-${category}`,
      closingSnapshotId: snapshot.closingSnapshotId,
      projectId: snapshot.projectId,
      category,
      estimatedAmount: estimated,
      actualAmount: actual,
      varianceAmount: variance,
      varianceRate: estimated > 0 ? variance / estimated : 1,
      rootCause: rootCause || category,
      recommendedPrevention: closingLeakPreventionKo[category] || closingLeakPreventionKo.UNKNOWN
    });
  }

  function analyzeProjectClosingCostLeaks(snapshot, basis, createdAt = nowIso()) {
    const leaks = [];
    pushClosingLeak(leaks, snapshot, 'MATERIAL_COST_OVER', basis.estimatedMaterialCost, basis.actualMaterialCost);
    pushClosingLeak(leaks, snapshot, 'LABOR_COST_OVER', basis.estimatedLaborCost, basis.actualLaborCost);
    pushClosingLeak(leaks, snapshot, 'DEFECT_REWORK_COST', 0, basis.defectCost);
    pushClosingLeak(leaks, snapshot, 'SCHEDULE_DELAY_COST', 0, basis.scheduleVarianceDays * 50000);
    pushClosingLeak(leaks, snapshot, 'ESTIMATE_MISSING_ITEM', basis.estimatedCost, basis.actualCost);
    if (basis.changeOrderRevenue > 0 && basis.changeOrderRevenue - basis.changeOrderCost < basis.changeOrderRevenue * 0.25) {
      pushClosingLeak(leaks, snapshot, 'CHANGE_ORDER_UNDERPRICED', Math.round(basis.changeOrderRevenue * 0.75), basis.changeOrderCost);
    }

    db.project.prepare('DELETE FROM project_closing_cost_leaks WHERE closing_snapshot_id = ?').run(snapshot.closingSnapshotId);
    const insert = db.project.prepare(`
      INSERT INTO project_closing_cost_leaks (
        leak_id, closing_snapshot_id, project_id, category, estimated_amount,
        actual_amount, variance_amount, variance_rate, root_cause,
        recommended_prevention, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    leaks.forEach((leak) => insert.run(
      leak.leakId,
      leak.closingSnapshotId,
      leak.projectId,
      leak.category,
      leak.estimatedAmount,
      leak.actualAmount,
      leak.varianceAmount,
      leak.varianceRate,
      leak.rootCause,
      leak.recommendedPrevention,
      createdAt
    ));
    return leaks;
  }

  function createEstimateCalibrationRulesFromClosing(projectId, leaks, createdAt = nowIso()) {
    const rules = leaks.map((leak) => {
      const ruleType = leak.category.includes('LABOR') ? 'LABOR_FACTOR_ADJUSTMENT'
        : leak.category.includes('MATERIAL') ? 'MATERIAL_BUFFER_ADJUSTMENT'
          : leak.category.includes('DEFECT') ? 'INSPECTION_PREVENTION_CHECK'
            : leak.category.includes('CHANGE_ORDER') ? 'CHANGE_ORDER_MARGIN_RULE'
              : 'MANDATORY_CHECKLIST_ITEM';
      const id = `ECR-${projectId}-${leak.category}`;
      const adjustmentValue = leak.estimatedAmount > 0 ? Math.min(0.3, Math.max(0.05, leak.varianceRate)) : 0.1;
      db.project.prepare(`
        INSERT OR REPLACE INTO estimate_calibration_rules (
          id, source_project_id, source_category, rule_type, adjustment_target,
          adjustment_value, reason, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM estimate_calibration_rules WHERE id = ?), ?))
      `).run(
        id,
        projectId,
        leak.category,
        ruleType,
        leak.category,
        adjustmentValue,
        leak.recommendedPrevention,
        'ACTIVE',
        id,
        createdAt
      );
      return db.project.prepare('SELECT * FROM estimate_calibration_rules WHERE id = ?').get(id);
    });
    return rules;
  }

  function buildClosingReportPayload(snapshot, leaks, rules, templateCandidate) {
    return {
      titleKo: '프로젝트 마감 리포트',
      projectId: snapshot.project_id,
      finalJudgement: snapshot.closing_status,
      revenue: {
        estimatedRevenue: snapshot.estimated_revenue,
        actualReceivedRevenue: snapshot.actual_received_revenue,
        unpaidReceivable: snapshot.unpaid_receivable
      },
      cost: {
        estimatedCost: snapshot.estimated_cost,
        actualCost: snapshot.actual_cost,
        actualMaterialCost: snapshot.actual_material_cost,
        actualLaborCost: snapshot.actual_labor_cost,
        defectCost: snapshot.defect_cost,
        unpaidPayable: snapshot.unpaid_payable
      },
      margin: {
        expectedMargin: snapshot.expected_margin,
        actualMargin: snapshot.actual_margin,
        expectedMarginRate: snapshot.expected_margin_rate,
        actualMarginRate: snapshot.actual_margin_rate,
        marginVariance: snapshot.margin_variance
      },
      schedule: {
        plannedStartDate: snapshot.planned_start_date,
        actualStartDate: snapshot.actual_start_date,
        plannedEndDate: snapshot.planned_end_date,
        actualEndDate: snapshot.actual_end_date,
        scheduleVarianceDays: snapshot.schedule_variance_days
      },
      costLeaks: leaks,
      estimateCalibrationRules: rules,
      templateCandidate
    };
  }

  function upsertClosingReport(snapshot, leaks, rules, templateCandidate, createdAt = nowIso()) {
    const reportId = `PCR-${snapshot.project_id}`;
    const payload = buildClosingReportPayload(snapshot, leaks, rules, templateCandidate);
    db.project.prepare(`
      INSERT OR REPLACE INTO project_closing_reports (
        report_id, closing_snapshot_id, project_id, report_status,
        printable_payload_json, pdf_export_ready, excel_export_ready,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM project_closing_reports WHERE report_id = ?), ?), ?)
    `).run(
      reportId,
      snapshot.closing_snapshot_id,
      snapshot.project_id,
      'EXPORT_READY',
      toJson(payload),
      1,
      1,
      reportId,
      createdAt,
      createdAt
    );
    return db.project.prepare('SELECT * FROM project_closing_reports WHERE report_id = ?').get(reportId);
  }

  function syncClosingAlerts(createdAt = nowIso()) {
    db.project.prepare(`
      SELECT *
      FROM project_closing_snapshots
      WHERE closing_status IN ('BLOCKED_BY_RECEIVABLE', 'BLOCKED_BY_PAYABLE', 'BLOCKED_BY_DEFECT', 'CLOSED_REVIEW_REQUIRED', 'CLOSED_LOSS')
    `).all().forEach((row) => {
      const isRed = row.closing_status !== 'CLOSED_REVIEW_REQUIRED';
      upsertCeoDecisionItem({
        decisionId: `CEO-CLOSING-${row.project_id}`,
        sourceModule: 'Closing',
        entityType: 'ProjectClosingSnapshot',
        entityId: row.closing_snapshot_id,
        decisionType: row.closing_status,
        titleKo: isRed ? '프로젝트 마감 차단' : '실제 마진 25% 미만',
        projectId: row.project_id,
        siteNameKo: row.project_id,
        financialImpact: Math.abs(Number(row.margin_variance || 0)),
        riskLevel: isRed ? 'RED' : 'ORANGE',
        requiredActionKo: '마감 리포트 검토',
        deadline: row.updated_at?.slice(0, 10),
        payload: row
      }, createdAt);
      if (isRed) {
        upsertRedAlertEvent({
          redAlertId: `RED-CLOSING-${row.project_id}`,
          sourceModule: 'Closing',
          entityId: row.closing_snapshot_id,
          projectId: row.project_id,
          titleKo: '프로젝트 마감 RED ALERT',
          reasonKo: row.closing_status,
          financialImpact: Math.abs(Number(row.margin_variance || 0)),
          blockingRequired: true,
          payload: row
        }, createdAt);
      }
    });

    db.project.prepare(`
      SELECT *
      FROM project_closing_snapshots
      WHERE actual_margin_rate >= 0.35
        AND unpaid_receivable = 0
        AND closing_status = 'CLOSED_PROFIT'
    `).all().forEach((row) => {
      upsertCeoDecisionItem({
        decisionId: `CEO-CLOSING-TEMPLATE-${row.project_id}`,
        sourceModule: 'Closing',
        entityType: 'ProjectClosingSnapshot',
        entityId: row.closing_snapshot_id,
        decisionType: 'PROFIT_TEMPLATE_CANDIDATE',
        titleKo: '고마진 템플릿 후보',
        projectId: row.project_id,
        siteNameKo: row.project_id,
        financialImpact: row.actual_margin,
        riskLevel: 'NORMAL',
        requiredActionKo: '템플릿 저장 검토',
        deadline: row.updated_at?.slice(0, 10),
        payload: row
      }, createdAt);
    });
  }

  function maybeCreateClosingProfitTemplate(basis, snapshot, createdAt = nowIso()) {
    if (
      snapshot.actual_margin_rate < 0.35 ||
      snapshot.unpaid_receivable > 0 ||
      basis.unresolvedMajorDefects > 0 ||
      snapshot.schedule_variance_days > 2
    ) {
      return {
        eligible: false,
        reasonKo: '고마진 템플릿 저장 조건 미충족'
      };
    }
    const template = createProfitTemplateFromCompletion({
      projectId: snapshot.project_id,
      projectType: 'bathroom_remodel',
      areaM2: Number(basis.source.estimate?.bathroom_area_m2 || 0),
      actualCosts: {
        totalActualCost: snapshot.actual_cost,
        materialCost: snapshot.actual_material_cost,
        laborCost: snapshot.actual_labor_cost,
        changeOrderCost: snapshot.change_order_cost,
        defectCost: snapshot.defect_cost
      },
      actualDurationDays: Math.max(1, daysBetween(snapshot.actual_start_date, snapshot.actual_end_date)),
      finalMarginRate: snapshot.actual_margin_rate * 100,
      defects: [],
      claims: [],
      reworkRequired: false,
      estimatedDurationDays: Math.max(1, daysBetween(snapshot.planned_start_date, snapshot.planned_end_date)),
      createdAt
    });
    return {
      eligible: Boolean(template?.created),
      template,
      reasonKo: template?.created ? '고마진 프로젝트 구조가 템플릿 후보로 저장되었습니다.' : '템플릿 저장 조건을 통과하지 못했습니다.'
    };
  }

  function createProjectClosingSnapshot({ projectId, actor = 'CEO' }) {
    const createdAt = nowIso();
    if (!projectId) throw new Error('Project closing requires projectId.');
    const basis = buildProjectClosingBasis(projectId, createdAt);
    const closingSnapshotId = `PCS-${projectId}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO project_closing_snapshots (
        closing_snapshot_id, project_id, estimate_id, contract_id, estimated_revenue,
        actual_received_revenue, estimated_cost, actual_cost, expected_margin,
        actual_margin, expected_margin_rate, actual_margin_rate, margin_variance,
        planned_start_date, actual_start_date, planned_end_date, actual_end_date,
        schedule_variance_days, estimated_labor_cost, actual_labor_cost,
        estimated_material_cost, actual_material_cost, change_order_revenue,
        change_order_cost, defect_cost, unpaid_receivable, unpaid_payable,
        closing_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM project_closing_snapshots WHERE closing_snapshot_id = ?), ?), ?)
    `).run(
      closingSnapshotId,
      basis.projectId,
      basis.estimateId,
      basis.contractId,
      basis.estimatedRevenue,
      basis.actualReceivedRevenue,
      basis.estimatedCost,
      basis.actualCost,
      basis.expectedMargin,
      basis.actualMargin,
      basis.expectedMarginRate,
      basis.actualMarginRate,
      basis.marginVariance,
      basis.plannedStartDate,
      basis.actualStartDate,
      basis.plannedEndDate,
      basis.actualEndDate,
      basis.scheduleVarianceDays,
      basis.estimatedLaborCost,
      basis.actualLaborCost,
      basis.estimatedMaterialCost,
      basis.actualMaterialCost,
      basis.changeOrderRevenue,
      basis.changeOrderCost,
      basis.defectCost,
      basis.unpaidReceivable,
      basis.unpaidPayable,
      basis.closingStatus,
      closingSnapshotId,
      createdAt,
      createdAt
    );
    const snapshot = db.project.prepare('SELECT * FROM project_closing_snapshots WHERE closing_snapshot_id = ?').get(closingSnapshotId);
    const costLeaks = analyzeProjectClosingCostLeaks({ ...basis, closingSnapshotId }, basis, createdAt);
    const calibrationRules = createEstimateCalibrationRulesFromClosing(projectId, costLeaks, createdAt);
    const templateCandidate = maybeCreateClosingProfitTemplate(basis, snapshot, createdAt);
    const closingReport = upsertClosingReport(snapshot, costLeaks, calibrationRules, templateCandidate, createdAt);

    insertNotification({
      level: snapshot.closing_status.startsWith('BLOCKED') || snapshot.closing_status === 'CLOSED_LOSS' ? 'RED' : snapshot.closing_status === 'CLOSED_REVIEW_REQUIRED' ? 'WARNING' : 'INFO',
      messageKo: `프로젝트 마감 스냅샷 생성: ${snapshot.closing_status}`,
      relatedProjectId: projectId,
      actionKo: 'Project Closing',
      createdAt
    });
    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`ACT-CLOSING-${projectId}-${Date.now()}`, 'PROJECT_CLOSING_SNAPSHOT', actor, projectId, null, toJson(snapshot), '프로젝트 마감 스냅샷 생성', createdAt);
    syncClosingAlerts(createdAt);
    return {
      closingSnapshot: snapshot,
      costLeaks,
      calibrationRules,
      templateCandidate,
      closingReport,
      canClose: !String(snapshot.closing_status).startsWith('BLOCKED'),
      closingCenterData: getProjectClosingCenterData({ projectId, skipRefresh: true })
    };
  }

  function finalizeProjectClosing({ projectId, actor = 'CEO', override = false, reasonKo = '프로젝트 마감 확정' }) {
    const createdAt = nowIso();
    const result = createProjectClosingSnapshot({ projectId, actor });
    const status = result.closingSnapshot.closing_status;
    if (String(status).startsWith('BLOCKED') && !override) {
      throw new Error(`Project closing blocked: ${status}`);
    }
    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`ACT-CLOSING-FINAL-${projectId}-${Date.now()}`, 'PROJECT_CLOSING_FINALIZE', actor, projectId, null, toJson({ status, override }), reasonKo, createdAt);
    insertNotification({ level: status === 'CLOSED_PROFIT' ? 'INFO' : 'WARNING', messageKo: `프로젝트 마감 확정: ${status}`, relatedProjectId: projectId, actionKo: 'Closing Finalized', createdAt });
    return { ...result, finalized: true, overrideUsed: Boolean(override) };
  }

  function saveHighMarginTemplateFromClosing({ projectId, actor = 'CEO' }) {
    const createdAt = nowIso();
    const basis = buildProjectClosingBasis(projectId, createdAt);
    const snapshot = db.project.prepare('SELECT * FROM project_closing_snapshots WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId)
      || createProjectClosingSnapshot({ projectId, actor }).closingSnapshot;
    return maybeCreateClosingProfitTemplate(basis, snapshot, createdAt);
  }

  function getApprovedCalibrationRules(estimateType = null) {
    return db.project.prepare(`
      SELECT *
      FROM estimate_calibration_rules
      WHERE status = 'APPROVED'
        AND (? IS NULL OR estimate_type = ?)
      ORDER BY confidence_score DESC, created_at DESC
    `).all(estimateType, estimateType);
  }

  function applyApprovedCalibrationToEstimate(estimate, estimateType = 'bathroom_remodel') {
    const rules = getApprovedCalibrationRules(estimateType);
    if (!rules.length) {
      return { estimate, calibration: { applied: false, appliedRuleCount: 0, adjustmentAmount: 0, rules: [] } };
    }
    const totalRate = Math.min(0.5, rules.reduce((sum, rule) => sum + Math.max(0, Number(rule.adjustment_value || 0)), 0));
    const baseTotalCost = Number(estimate.total_cost ?? estimate.totalCost ?? 0);
    const adjustmentAmount = Math.round(baseTotalCost * totalRate);
    const adjustedTotalCost = baseTotalCost + adjustmentAmount;
    const revenue = Number(estimate.revenue || 0);
    const expectedMargin = revenue - adjustedTotalCost;
    const expectedMarginRate = revenue > 0 ? expectedMargin / revenue : 0;
    const calibrationRules = rules.map((rule) => ({
      id: rule.id,
      processType: rule.process_type,
      adjustmentType: rule.adjustment_type || rule.rule_type,
      adjustmentValue: rule.adjustment_value,
      reasonKo: rule.reason
    }));
    return {
      estimate: {
        ...estimate,
        total_cost: adjustedTotalCost,
        totalCost: adjustedTotalCost,
        expected_margin: expectedMargin,
        expectedMargin,
        expected_margin_rate: expectedMarginRate,
        expectedMarginRate,
        calibration_applied: true,
        calibration_adjustment_amount: adjustmentAmount,
        calibration_rules: calibrationRules
      },
      calibration: {
        applied: true,
        appliedRuleCount: rules.length,
        adjustmentAmount,
        adjustmentRate: totalRate,
        rules: calibrationRules,
        displayMessageKo: '최근 실제 원가 기준 보정 룰이 적용되었습니다.'
      }
    };
  }

  function upsertProjectRiskPatterns(createdAt = nowIso()) {
    const rows = db.project.prepare('SELECT * FROM project_cost_leaks').all();
    const grouped = new Map();
    rows.forEach((row) => {
      const key = row.category || 'UNKNOWN';
      grouped.set(key, [...(grouped.get(key) || []), row]);
    });
    const upsert = db.project.prepare(`
      INSERT OR REPLACE INTO project_risk_patterns (
        id, pattern_type, pattern_key, occurrence_count, average_margin_loss,
        average_delay_days, recommendation, severity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM project_risk_patterns WHERE id = ?), ?), ?)
    `);
    const patterns = [];
    grouped.forEach((groupRows, category) => {
      const pattern = buildRiskPattern({ category, rows: groupRows, createdAt });
      upsert.run(pattern.id, pattern.patternType, pattern.patternKey, pattern.occurrenceCount, pattern.averageMarginLoss, pattern.averageDelayDays, pattern.recommendation, pattern.severity, pattern.id, createdAt, createdAt);
      patterns.push(pattern);
    });
    return patterns;
  }

  function createCalibrationRulesFromLeaks(projectId, leaks, createdAt = nowIso()) {
    const insert = db.project.prepare(`
      INSERT OR REPLACE INTO estimate_calibration_rules (
        id, source_project_id, source_category, rule_type, adjustment_target,
        adjustment_value, reason, status, created_at, estimate_type, process_type,
        condition_json, adjustment_type, confidence_score, source_project_ids,
        auto_generated, requires_approval, approved_at, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,
        COALESCE((SELECT created_at FROM estimate_calibration_rules WHERE id = ?), ?),
        ?, ?, ?, ?, ?, ?, ?, ?,
        (SELECT approved_at FROM estimate_calibration_rules WHERE id = ?),
        (SELECT approved_by FROM estimate_calibration_rules WHERE id = ?)
      )
    `);
    return leaks.map((leak) => {
      const rows = db.project.prepare('SELECT project_id FROM project_cost_leaks WHERE category = ? ORDER BY created_at DESC').all(leak.category);
      const sourceProjectIds = Array.from(new Set([projectId, ...rows.map((row) => row.project_id)])).slice(0, 10);
      const rule = buildCalibrationRule({ leak, occurrenceCount: sourceProjectIds.length, sourceProjectIds, createdAt });
      insert.run(
        rule.id,
        projectId,
        leak.category,
        rule.adjustmentType,
        rule.processType,
        rule.adjustmentValue,
        rule.reason,
        'PENDING_APPROVAL',
        rule.id,
        createdAt,
        rule.estimateType,
        rule.processType,
        rule.conditionJson,
        rule.adjustmentType,
        rule.confidenceScore,
        toJson(rule.sourceProjectIds),
        rule.autoGenerated ? 1 : 0,
        rule.requiresApproval ? 1 : 0,
        rule.id,
        rule.id
      );
      return db.project.prepare('SELECT * FROM estimate_calibration_rules WHERE id = ?').get(rule.id);
    });
  }

  function createProjectCalibrationSnapshot({ projectId, actor = 'CEO' }) {
    const createdAt = nowIso();
    if (!projectId) throw new Error('projectId is required for calibration.');
    const closing = db.project.prepare('SELECT * FROM project_closing_snapshots WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId)
      || createProjectClosingSnapshot({ projectId, actor }).closingSnapshot;
    const comparison = compareExpectedActual(closing);
    const sourceLeaks = db.project.prepare(`
      SELECT *
      FROM project_closing_cost_leaks
      WHERE project_id = ?
      ORDER BY variance_amount DESC, created_at DESC
    `).all(projectId);
    const leaks = sourceLeaks.map((sourceLeak) => buildProjectCostLeak({ projectId, sourceLeak, comparison, createdAt }));
    const insertLeak = db.project.prepare(`
      INSERT OR REPLACE INTO project_cost_leaks (
        id, project_id, category, category_ko, expected_amount, actual_amount,
        variance_amount, variance_rate, root_cause, prevention_rule,
        severity, risk_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    leaks.forEach((leak) => insertLeak.run(leak.id, leak.projectId, leak.category, leak.categoryKo, leak.expectedAmount, leak.actualAmount, leak.varianceAmount, leak.varianceRate, leak.rootCause, leak.preventionRule, leak.severity, leak.riskScore, createdAt));
    const calibrationRules = createCalibrationRulesFromLeaks(projectId, leaks, createdAt);
    const riskPatterns = upsertProjectRiskPatterns(createdAt);
    if (calibrationRules.length) {
      upsertCeoDecisionItem({
        decisionId: `CEO-CALIBRATION-${projectId}`,
        sourceModule: 'Calibration',
        entityType: 'EstimateCalibrationRule',
        entityId: calibrationRules[0].id,
        decisionType: 'CALIBRATION_APPROVAL_REQUIRED',
        titleKo: '자동 보정 승인 대기',
        projectId,
        siteNameKo: projectId,
        financialImpact: leaks.reduce((sum, leak) => sum + Math.max(0, Number(leak.varianceAmount || 0)), 0),
        riskLevel: leaks.some((leak) => leak.severity === 'RED') ? 'RED' : 'ORANGE',
        requiredActionKo: '보정 룰 승인 또는 반려',
        deadline: createdAt.slice(0, 10),
        payload: { ruleIds: calibrationRules.map((rule) => rule.id), leaks }
      }, createdAt);
    }
    insertNotification({
      level: leaks.some((leak) => leak.severity === 'RED') ? 'RED' : leaks.length ? 'WARNING' : 'INFO',
      messageKo: `실제 프로젝트 보정 분석 완료: ${projectId}`,
      relatedProjectId: projectId,
      actionKo: 'Calibration',
      createdAt
    });
    return { comparison, costLeaks: leaks, calibrationRules, riskPatterns, calibrationCenterData: getProjectCalibrationCenterData({ projectId }) };
  }

  function decideCalibrationRule({ ruleId, decision, actor = 'CEO', reasonKo = '' }) {
    if (!ruleId) throw new Error('ruleId is required.');
    const normalized = decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : decision === 'TESTING' ? 'TESTING' : null;
    if (!normalized) throw new Error('decision must be APPROVED, REJECTED, or TESTING.');
    const createdAt = nowIso();
    const rule = db.project.prepare('SELECT * FROM estimate_calibration_rules WHERE id = ?').get(ruleId);
    if (!rule) throw new Error(`Calibration rule not found: ${ruleId}`);
    db.project.prepare(`
      UPDATE estimate_calibration_rules
      SET status = ?, approved_at = CASE WHEN ? = 'APPROVED' THEN ? ELSE approved_at END,
          approved_by = CASE WHEN ? = 'APPROVED' THEN ? ELSE approved_by END
      WHERE id = ?
    `).run(normalized, normalized, createdAt, normalized, actor, ruleId);
    db.project.prepare(`
      INSERT INTO calibration_approval_logs (
        id, rule_id, project_id, decision, previous_status, next_status,
        reason_ko, actor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`CAL-LOG-${ruleId}-${Date.now()}`, ruleId, rule.source_project_id, normalized, rule.status, normalized, reasonKo || (normalized === 'APPROVED' ? '다음 견적 반영 승인' : normalized === 'REJECTED' ? '보정 반려' : '테스트 적용'), actor, createdAt);
    insertNotification({
      level: normalized === 'APPROVED' ? 'INFO' : normalized === 'REJECTED' ? 'WARNING' : 'INFO',
      messageKo: `보정 룰 ${normalized}: ${ruleId}`,
      relatedProjectId: rule.source_project_id,
      actionKo: 'Calibration Approval',
      createdAt
    });
    return { rule: db.project.prepare('SELECT * FROM estimate_calibration_rules WHERE id = ?').get(ruleId), calibrationCenterData: getProjectCalibrationCenterData({ projectId: rule.source_project_id }) };
  }

  function getCalibrationSummary() {
    const leaks = db.project.prepare(`
      SELECT category, category_ko, COUNT(*) AS count, COALESCE(SUM(variance_amount), 0) AS total_loss
      FROM project_cost_leaks
      GROUP BY category, category_ko
      ORDER BY total_loss DESC
      LIMIT 5
    `).all();
    const pending = Number(db.project.prepare("SELECT COUNT(*) AS count FROM estimate_calibration_rules WHERE status = 'PENDING_APPROVAL'").get().count || 0);
    const approved = Number(db.project.prepare("SELECT COUNT(*) AS count FROM estimate_calibration_rules WHERE status = 'APPROVED'").get().count || 0);
    const patterns = db.project.prepare('SELECT * FROM project_risk_patterns ORDER BY occurrence_count DESC, average_margin_loss DESC LIMIT 5').all();
    const bestTemplate = db.project.prepare('SELECT * FROM profit_templates ORDER BY margin DESC, created_at DESC LIMIT 1').get() || null;
    return { topCostLeaks: leaks, pendingCalibrationApprovals: pending, approvedCalibrationRules: approved, repeatedRiskPatterns: patterns, bestProfitTemplate: bestTemplate, displayStatusKo: leaks.length || pending || approved ? '데이터 있음' : '데이터 없음' };
  }

  function getProjectCalibrationCenterData({ projectId = null } = {}) {
    const snapshots = db.project.prepare(`
      SELECT *
      FROM project_closing_snapshots
      WHERE (? IS NULL OR project_id = ?)
      ORDER BY updated_at DESC
      LIMIT 50
    `).all(projectId, projectId);
    const comparisons = snapshots.map((snapshot) => compareExpectedActual(snapshot));
    const costLeaks = db.project.prepare(`
      SELECT *
      FROM project_cost_leaks
      WHERE (? IS NULL OR project_id = ?)
      ORDER BY variance_amount DESC, created_at DESC
      LIMIT 100
    `).all(projectId, projectId);
    const calibrationRules = db.project.prepare(`
      SELECT *
      FROM estimate_calibration_rules
      WHERE (? IS NULL OR source_project_id = ?)
      ORDER BY CASE status WHEN 'PENDING_APPROVAL' THEN 0 WHEN 'TESTING' THEN 1 WHEN 'APPROVED' THEN 2 ELSE 3 END,
        confidence_score DESC, created_at DESC
      LIMIT 100
    `).all(projectId, projectId).map((rule) => ({ ...rule, sourceProjectIds: fromJson(rule.source_project_ids, []) }));
    const riskPatterns = db.project.prepare('SELECT * FROM project_risk_patterns ORDER BY occurrence_count DESC, average_margin_loss DESC LIMIT 50').all();
    const approvalLogs = db.project.prepare(`
      SELECT *
      FROM calibration_approval_logs
      WHERE (? IS NULL OR project_id = ?)
      ORDER BY created_at DESC
      LIMIT 100
    `).all(projectId, projectId);
    return {
      snapshotDate: nowIso().slice(0, 10),
      emptyState: snapshots.length === 0 && costLeaks.length === 0 && calibrationRules.length === 0,
      emptyMessageKo: '아직 실제 프로젝트 보정 데이터가 없습니다.',
      summary: {
        projectCount: snapshots.length,
        costLeakCount: costLeaks.length,
        pendingApprovalCount: calibrationRules.filter((rule) => rule.status === 'PENDING_APPROVAL').length,
        approvedRuleCount: calibrationRules.filter((rule) => rule.status === 'APPROVED').length,
        repeatedPatternCount: riskPatterns.filter((pattern) => Number(pattern.occurrence_count || 0) >= 2).length,
        totalLeakAmount: costLeaks.reduce((sum, leak) => sum + Math.max(0, Number(leak.variance_amount || 0)), 0)
      },
      comparisons,
      costLeaks,
      calibrationRules,
      riskPatterns,
      approvalLogs,
      categoryLabelsKo: COST_LEAK_LABELS_KO
    };
  }

  function getProjectClosingCenterData({ projectId = null, skipRefresh = false } = {}) {
    if (projectId && !skipRefresh) {
      const existing = db.project.prepare('SELECT * FROM project_closing_snapshots WHERE project_id = ?').get(projectId);
      if (!existing) createProjectClosingSnapshot({ projectId });
    }
    const snapshots = db.project.prepare(`
      SELECT *
      FROM project_closing_snapshots
      WHERE (? IS NULL OR project_id = ?)
      ORDER BY updated_at DESC
      LIMIT 50
    `).all(projectId, projectId);
    const costLeaks = db.project.prepare(`
      SELECT *
      FROM project_closing_cost_leaks
      WHERE (? IS NULL OR project_id = ?)
      ORDER BY variance_amount DESC, created_at DESC
      LIMIT 100
    `).all(projectId, projectId);
    const reports = db.project.prepare(`
      SELECT *
      FROM project_closing_reports
      WHERE (? IS NULL OR project_id = ?)
      ORDER BY updated_at DESC
      LIMIT 50
    `).all(projectId, projectId).map((row) => ({ ...row, printablePayload: fromJson(row.printable_payload_json, {}) }));
    const calibrationRules = db.project.prepare(`
      SELECT *
      FROM estimate_calibration_rules
      WHERE (? IS NULL OR source_project_id = ?)
      ORDER BY created_at DESC
      LIMIT 100
    `).all(projectId, projectId);
    const summary = {
      closingProjectCount: snapshots.length,
      blockedCount: snapshots.filter((row) => String(row.closing_status).startsWith('BLOCKED')).length,
      reviewRequiredCount: snapshots.filter((row) => row.closing_status === 'CLOSED_REVIEW_REQUIRED').length,
      lossCount: snapshots.filter((row) => row.closing_status === 'CLOSED_LOSS').length,
      profitCount: snapshots.filter((row) => row.closing_status === 'CLOSED_PROFIT').length,
      highMarginTemplateCandidateCount: snapshots.filter((row) => Number(row.actual_margin_rate || 0) >= 0.35 && Number(row.unpaid_receivable || 0) === 0).length,
      totalActualMargin: snapshots.reduce((total, row) => total + Number(row.actual_margin || 0), 0),
      totalCostLeakAmount: costLeaks.reduce((total, row) => total + Number(row.variance_amount || 0), 0)
    };
    return {
      snapshotDate: nowIso().slice(0, 10),
      summary,
      snapshots,
      costLeaks,
      reports,
      calibrationRules,
      statusLabelsKo: {
        READY_TO_CLOSE: '마감 검토 가능',
        BLOCKED_BY_RECEIVABLE: '미수금으로 마감 불가',
        BLOCKED_BY_PAYABLE: '미지급으로 마감 주의',
        BLOCKED_BY_DEFECT: '하자 미해결로 마감 불가',
        CLOSED_PROFIT: '수익 마감',
        CLOSED_LOSS: '손실 마감',
        CLOSED_REVIEW_REQUIRED: '대표 검토 필요'
      }
    };
  }

  function exportBathroomEstimateDocument({ estimateId, documentType = 'customer', format = 'pdf', actor = 'CEO' }) {
    const createdAt = nowIso();
    const model = getStoredBathroomEstimateModel(estimateId);
    const result = exportEstimateDocument({
      model,
      type: documentType,
      format,
      outputDir: estimateExportDir
    });

    insertNotification({
      level: 'INFO',
      messageKo: `견적 출력 생성: ${result.fileName}`,
      relatedProjectId: estimateId,
      actionKo: format === 'xlsx' ? 'Excel Export' : 'PDF Export',
      createdAt
    });

    db.logs.prepare(`
      INSERT INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACT-EST-EXPORT-${Date.now()}`,
      'EXPORT_BATHROOM_ESTIMATE',
      actor,
      estimateId,
      null,
      toJson(result),
      `${documentType}/${format} 견적 출력 생성`,
      createdAt
    );

    return result;
  }

  function generateBathroomContract({ estimateId, startDate = null, actor = 'CEO' }) {
    const createdAt = nowIso();
    const model = getStoredBathroomEstimateModel(estimateId);
    const contract = buildContractFromEstimate({ ...model, startDate });
    const contractId = contract.contractNumber;
    db.project.prepare(`
      INSERT OR REPLACE INTO contracts (
        contract_id, client_id, project_id, lead_id, contract_status, contract_amount,
        deposit_rate, interim_rate, balance_rate, scope_summary_ko, exclusions_ko,
        change_order_terms_ko, defect_warranty_terms_ko, approval_required, approved_by,
        approved_at, created_at, updated_at, estimate_id, contract_number, customer_name,
        site_name, project_name, deposit_amount, progress_payment_amount, balance_amount,
        start_date, end_date, duration_days, payment_terms, warranty_terms,
        cancellation_terms, special_terms, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contractId,
      `CLIENT-${estimateId}`,
      estimateId,
      null,
      contract.status,
      contract.contractAmount,
      0.3,
      0.4,
      0.3,
      contract.scopeSummaryKo,
      contract.specialTerms,
      '추가공사는 별도 승인 후 반영합니다.',
      contract.warrantyTerms,
      1,
      null,
      null,
      createdAt,
      createdAt,
      estimateId,
      contract.contractNumber,
      contract.customerName,
      contract.siteName,
      contract.projectName,
      contract.depositAmount,
      contract.progressPaymentAmount,
      contract.balanceAmount,
      contract.startDate,
      contract.endDate,
      contract.durationDays,
      contract.paymentTerms,
      contract.warrantyTerms,
      contract.cancellationTerms,
      contract.specialTerms,
      contract.status
    );
    insertNotification({ level: 'INFO', messageKo: `계약서 생성: ${contract.contractNumber}`, relatedProjectId: estimateId, actionKo: '계약서 생성', createdAt });
    createCommunicationDraft({
      messageType: 'CLIENT_CONTRACT_NOTICE',
      relatedEntityType: 'Contract',
      relatedEntityId: contractId,
      targetType: 'CLIENT',
      targetName: contract.customerName,
      status: 'READY',
      createdAt
    });
    syncCustomerPaymentScheduleFromContract(contractId, createdAt);
    syncCashflowSnapshot(createdAt);
    return { contractId, contract };
  }

  function exportBathroomContractPdf({ contractId, actor = 'CEO' }) {
    const row = db.project.prepare('SELECT * FROM contracts WHERE contract_id = ?').get(contractId);
    if (!row) throw new Error(`Contract not found: ${contractId}`);
    const contract = {
      contractNumber: row.contract_number || row.contract_id,
      estimateId: row.estimate_id || row.project_id,
      customerName: row.customer_name,
      siteName: row.site_name,
      projectName: row.project_name,
      scopeSummaryKo: row.scope_summary_ko,
      contractAmount: row.contract_amount,
      depositAmount: row.deposit_amount,
      progressPaymentAmount: row.progress_payment_amount,
      balanceAmount: row.balance_amount,
      startDate: row.start_date,
      endDate: row.end_date,
      durationDays: row.duration_days,
      paymentTerms: row.payment_terms,
      warrantyTerms: row.warranty_terms,
      cancellationTerms: row.cancellation_terms,
      specialTerms: row.special_terms
    };
    const result = exportContractPdf({ contract, outputDir: contractExportDir });
    insertNotification({ level: 'INFO', messageKo: `계약서 PDF 생성: ${result.fileName}`, relatedProjectId: contract.estimateId, actionKo: 'Contract PDF', createdAt: nowIso() });
    return result;
  }

  function generateBathroomSchedule({ estimateId, contractId = null, startDate = null }) {
    const createdAt = nowIso();
    const model = getStoredBathroomEstimateModel(estimateId);
    const schedule = buildScheduleFromEstimate({ ...model, contractId, startDate });
    const scheduleId = `SCH-${estimateId}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO construction_schedules (
        id, estimate_id, contract_id, schedule_name, start_date, end_date,
        duration_days, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(scheduleId, estimateId, contractId, schedule.scheduleName, schedule.startDate, schedule.endDate, schedule.durationDays, schedule.status, createdAt, createdAt);
    db.project.prepare('DELETE FROM construction_schedule_items WHERE schedule_id = ?').run(scheduleId);
    const insertItem = db.project.prepare(`
      INSERT INTO construction_schedule_items (
        id, schedule_id, process_name, start_date, end_date, duration_days,
        dependency, assignee, status, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    schedule.items.forEach((item) => {
      insertItem.run(`${scheduleId}-${String(item.sortOrder).padStart(2, '0')}`, scheduleId, item.processName, item.startDate, item.endDate, item.durationDays, item.dependency || '', item.assignee, item.status, item.sortOrder);
    });
    insertNotification({ level: 'INFO', messageKo: `공정표 생성: ${schedule.scheduleName}`, relatedProjectId: estimateId, actionKo: '공정표 생성', createdAt });
    createCommunicationDraft({
      messageType: 'CLIENT_SCHEDULE_NOTICE',
      relatedEntityType: 'Schedule',
      relatedEntityId: scheduleId,
      targetType: 'CLIENT',
      status: 'READY',
      createdAt
    });
    return { scheduleId, schedule };
  }

  function generateBathroomPurchaseOrder({ estimateId, contractId = null, requiredDate = null }) {
    const createdAt = nowIso();
    const model = getStoredBathroomEstimateModel(estimateId);
    const purchaseOrder = buildPurchaseOrderFromEstimate({ ...model, contractId, requiredDate });
    const purchaseOrderId = purchaseOrder.orderNumber;
    db.project.prepare(`
      INSERT OR REPLACE INTO purchase_orders (
        purchase_order_id, execution_project_id, project_id, order_status, unknown_price_warning,
        payload_json, created_at, estimate_id, contract_id, order_number, supplier_name,
        total_amount, status, required_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      purchaseOrderId,
      `EXEC-PENDING-${estimateId}`,
      estimateId,
      purchaseOrder.status,
      1,
      toJson({ source: 'BATHROOM_ESTIMATE', itemCount: purchaseOrder.items.length }),
      createdAt,
      estimateId,
      contractId,
      purchaseOrder.orderNumber,
      purchaseOrder.supplierName,
      purchaseOrder.totalAmount,
      purchaseOrder.status,
      purchaseOrder.requiredDate,
      createdAt
    );
    db.project.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(purchaseOrderId);
    const insertItem = db.project.prepare(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_name, specification, quantity, unit,
        expected_unit_price, expected_total, supplier_name, order_status,
        required_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    purchaseOrder.items.forEach((item, index) => {
      insertItem.run(`${purchaseOrderId}-ITEM-${String(index + 1).padStart(3, '0')}`, purchaseOrderId, item.itemName, item.specification, item.quantity, item.unit, item.expectedUnitPrice, item.expectedTotal, item.supplierName, item.orderStatus, item.requiredDate, item.notes);
    });
    insertNotification({ level: 'WARNING', messageKo: `발주서 생성: ${purchaseOrder.orderNumber} / 실제 공급가 확인 필요`, relatedProjectId: estimateId, actionKo: '발주서 생성', createdAt });
    createCommunicationDraft({
      messageType: 'VENDOR_PURCHASE_ORDER',
      relatedEntityType: 'PurchaseOrder',
      relatedEntityId: purchaseOrderId,
      targetType: 'VENDOR',
      targetName: purchaseOrder.supplierName,
      status: 'READY',
      createdAt
    });
    syncVendorPaymentScheduleFromPurchaseOrder(purchaseOrderId, createdAt);
    syncCashflowSnapshot(createdAt);
    return { purchaseOrderId, purchaseOrder, masterData: buildMasterDataUsageSummary('full_remodel') };
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

  function getEstimateSourceForClientPortal(estimateId) {
    const sources = [
      { estimateType: 'bathroom', labelKo: '욕실 리모델링', table: 'bathroom_estimates', itemTable: 'bathroom_estimate_items' },
      { estimateType: 'kitchen', labelKo: '주방 리모델링', table: 'kitchen_estimates', itemTable: 'kitchen_estimate_items' },
      { estimateType: 'full_remodeling', labelKo: '전체 리모델링', table: 'full_remodeling_estimates', itemTable: 'full_remodeling_estimate_items' }
    ];
    for (const source of sources) {
      const estimate = db.project.prepare(`SELECT * FROM ${source.table} WHERE id = ? LIMIT 1`).get(estimateId);
      if (estimate) return { ...source, estimate };
    }
    return null;
  }

  function getLatestClientPortalEstimate() {
    const rows = [
      ...db.project.prepare("SELECT id, created_at, updated_at FROM bathroom_estimates").all(),
      ...db.project.prepare("SELECT id, created_at, updated_at FROM kitchen_estimates").all(),
      ...db.project.prepare("SELECT id, created_at, updated_at FROM full_remodeling_estimates").all()
    ].sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
    return rows[0]?.id || null;
  }

  function resolveClientPortalContext({ projectId = null, token = null } = {}) {
    let activeProjectId = projectId;
    let tokenRow = null;
    if (token) {
      tokenRow = db.project.prepare(`
        SELECT *
        FROM client_portal_tokens
        WHERE token = ? AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(token);
      if (tokenRow) activeProjectId = tokenRow.project_id;
    }

    let contract = activeProjectId
      ? db.project.prepare(`
          SELECT *
          FROM contracts
          WHERE project_id = ? OR estimate_id = ? OR contract_id = ? OR contract_number = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT 1
        `).get(activeProjectId, activeProjectId, activeProjectId, activeProjectId)
      : null;
    if (!contract) contract = db.project.prepare('SELECT * FROM contracts ORDER BY updated_at DESC, created_at DESC LIMIT 1').get();

    const estimateId = contract?.estimate_id || contract?.project_id || activeProjectId || getLatestClientPortalEstimate();
    const estimateSource = estimateId ? getEstimateSourceForClientPortal(estimateId) : null;
    const estimate = estimateSource?.estimate || null;
    activeProjectId = contract?.project_id || estimate?.project_id || estimateId || activeProjectId || 'CLIENT-PORTAL-DEMO';
    const client = contract?.client_id ? db.project.prepare('SELECT * FROM clients WHERE client_id = ? LIMIT 1').get(contract.client_id) : null;

    return { projectId: activeProjectId, estimateId, contract, estimateSource, estimate, client, tokenRow };
  }

  function buildClientSafeEstimateView(estimateSource) {
    if (!estimateSource) {
      return {
        estimateId: null,
        estimateTypeKo: '견적 데이터 없음',
        customerName: '고객명 확인 필요',
        siteName: '현장명 확인 필요',
        totalCustomerAmount: 0,
        scopeSummaryKo: '먼저 견적을 생성하세요.',
        separateAgreementItemsKo: ['추가공사는 별도 승인 후 진행'],
        validUntil: '데이터 없음',
        groupedItems: []
      };
    }
    const { estimate, itemTable, labelKo } = estimateSource;
    const items = db.project.prepare(`
      SELECT category, item_name, quantity, unit, customer_unit_price, customer_total
      FROM ${itemTable}
      WHERE estimate_id = ?
      ORDER BY category, item_name
    `).all(estimate.id);
    const grouped = new Map();
    items.forEach((item) => {
      if (!grouped.has(item.category)) grouped.set(item.category, { category: item.category, totalCustomerAmount: 0, items: [] });
      const group = grouped.get(item.category);
      group.totalCustomerAmount += Number(item.customer_total || 0);
      group.items.push({
        itemName: item.item_name,
        quantity: Number(item.quantity || 0),
        unit: item.unit,
        customerUnitPrice: Number(item.customer_unit_price || 0),
        customerTotal: Number(item.customer_total || 0)
      });
    });
    const validUntil = new Date(estimate.created_at || nowIso());
    validUntil.setDate(validUntil.getDate() + 14);
    return {
      estimateId: estimate.id,
      estimateTypeKo: labelKo,
      customerName: estimate.customer_name,
      siteName: estimate.site_name,
      totalCustomerAmount: Number(estimate.revenue || 0),
      scopeSummaryKo: `${labelKo} 공사 범위와 선택 옵션 기준 견적입니다.`,
      separateAgreementItemsKo: ['추가공사', '현장 확인 후 변경되는 항목', '고객 요청 변경'],
      validUntil: validUntil.toISOString().slice(0, 10),
      groupedItems: Array.from(grouped.values())
    };
  }

  function buildClientSafeContractView(contract, estimateView) {
    const amount = Number(contract?.contract_amount || estimateView.totalCustomerAmount || 0);
    if (!contract) {
      return {
        contractId: null,
        contractNumber: '계약서 미생성',
        projectName: estimateView.estimateTypeKo,
        contractAmount: amount,
        paymentTerms: '계약금 30% / 중도금 40% / 잔금 30%',
        depositAmount: Math.round(amount * 0.3),
        progressPaymentAmount: Math.round(amount * 0.4),
        balanceAmount: Math.round(amount * 0.3),
        startDate: '일정 협의 필요',
        endDate: '일정 협의 필요',
        durationDays: 0,
        warrantyTerms: '계약서 생성 후 확정',
        specialTerms: '특약사항 없음',
        signatureStatus: '대기'
      };
    }
    return {
      contractId: contract.contract_id,
      contractNumber: contract.contract_number || contract.contract_id,
      projectName: contract.project_name || estimateView.estimateTypeKo,
      contractAmount: amount,
      paymentTerms: contract.payment_terms || '계약금 30% / 중도금 40% / 잔금 30%',
      depositAmount: Number(contract.deposit_amount || Math.round(amount * Number(contract.deposit_rate || 0.3))),
      progressPaymentAmount: Number(contract.progress_payment_amount || Math.round(amount * Number(contract.interim_rate || 0.4))),
      balanceAmount: Number(contract.balance_amount || Math.round(amount * Number(contract.balance_rate || 0.3))),
      startDate: contract.start_date || '일정 협의 필요',
      endDate: contract.end_date || '일정 협의 필요',
      durationDays: Number(contract.duration_days || 0),
      warrantyTerms: contract.warranty_terms || contract.defect_warranty_terms_ko || '하자보수 조건 확인 필요',
      specialTerms: contract.special_terms || '특약사항 없음',
      signatureStatus: contract.status === 'APPROVED' || contract.contract_status === 'APPROVED' ? '확인 가능' : '확인 대기'
    };
  }

  function getClientPortalData(payload = {}) {
    const context = resolveClientPortalContext(payload);
    const estimateView = buildClientSafeEstimateView(context.estimateSource);
    const contractView = buildClientSafeContractView(context.contract, estimateView);
    const projectId = context.projectId;
    const estimateId = context.estimateId || estimateView.estimateId || projectId;
    const customerName = context.client?.customer_name_ko || context.contract?.customer_name || estimateView.customerName || '고객명 확인 필요';
    const siteName = context.contract?.site_name || estimateView.siteName || context.client?.site_address_ko || '현장명 확인 필요';
    const today = nowIso().slice(0, 10);

    const schedule = db.project.prepare(`
      SELECT *
      FROM construction_schedules
      WHERE estimate_id = ? OR contract_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `).get(estimateId, context.contract?.contract_id || '');
    const scheduleItems = schedule ? db.project.prepare('SELECT * FROM construction_schedule_items WHERE schedule_id = ? ORDER BY sort_order ASC, start_date ASC').all(schedule.id) : [];
    const completedItems = scheduleItems.filter((item) => String(item.status || '').toUpperCase().includes('COMPLETE')).length;
    const nextSchedule = scheduleItems.find((item) => !String(item.status || '').toUpperCase().includes('COMPLETE')) || scheduleItems[0] || null;
    const todaySchedule = scheduleItems.find((item) => item.start_date <= today && item.end_date >= today) || nextSchedule;

    const progressReports = db.project.prepare(`
      SELECT *
      FROM daily_site_report_items
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(projectId).map((row) => ({
      processNameKo: row.process_name_ko,
      workContentKo: row.work_content_ko,
      tomorrowProcessKo: row.tomorrow_process_ko,
      photoStatus: row.photo_status || '사진 없음',
      noticeKo: row.delay_reason_ko ? '일정 조정 필요' : '특이사항 없음',
      managerKo: row.manager_ko,
      createdAt: row.created_at
    }));

    const payments = db.project.prepare(`
      SELECT payment_id, payment_type, due_date, scheduled_amount, actual_received_date,
             actual_received_amount, payment_status, notes_ko
      FROM customer_payments
      WHERE project_id = ? OR estimate_id = ? OR contract_id = ?
      ORDER BY due_date ASC, created_at ASC
    `).all(projectId, estimateId, context.contract?.contract_id || '').map((row) => ({
      paymentId: row.payment_id,
      paymentType: row.payment_type,
      dueDate: row.due_date,
      scheduledAmount: Number(row.scheduled_amount || 0),
      receivedDate: row.actual_received_date || null,
      receivedAmount: Number(row.actual_received_amount || 0),
      paymentStatus: row.payment_status,
      messageKo: row.notes_ko || '결제 일정 확인'
    }));

    const changeOrders = db.project.prepare(`
      SELECT change_order_id, request_date, requested_by_ko, change_content_ko,
             change_reason_ko, additional_amount, schedule_impact_days,
             customer_approval_status, signature_status, status, updated_at
      FROM change_orders
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(projectId).map((row) => ({
      changeOrderId: row.change_order_id,
      requestDate: row.request_date,
      requestedByKo: row.requested_by_ko,
      changeContentKo: row.change_content_ko,
      changeReasonKo: row.change_reason_ko,
      additionalAmount: Number(row.additional_amount || 0),
      scheduleImpactDays: Number(row.schedule_impact_days || 0),
      approvalStatus: row.customer_approval_status,
      signatureStatus: row.signature_status,
      status: row.status,
      updatedAt: row.updated_at
    }));

    const inspectionResults = db.project.prepare(`
      SELECT process_name_ko, check_item_ko, criterion_ko, result_status,
             photo_status, action_required_ko, inspector_ko, inspected_at
      FROM inspection_checklist_items
      WHERE project_id = ?
      ORDER BY inspected_at DESC, created_at DESC
      LIMIT 40
    `).all(projectId).map((row) => ({
      processNameKo: row.process_name_ko,
      checkItemKo: row.check_item_ko,
      criterionKo: row.criterion_ko,
      resultKo: row.result_status === 'PASS' ? 'PASS' : '보완 필요',
      photoStatus: row.photo_status || '사진 없음',
      actionKo: row.action_required_ko || '조치사항 없음',
      inspectorKo: row.inspector_ko,
      inspectedAt: row.inspected_at
    }));

    const defectRequests = db.project.prepare(`
      SELECT id, defect_location_ko, defect_content_ko, photo_path, urgent,
             contact_time_ko, request_status, related_defect_id, created_at
      FROM client_defect_requests
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(projectId).map((row) => ({
      requestId: row.id,
      defectLocationKo: row.defect_location_ko,
      defectContentKo: row.defect_content_ko,
      photoStatus: row.photo_path ? '사진 첨부' : '사진 없음',
      urgent: Boolean(row.urgent),
      contactTimeKo: row.contact_time_ko,
      requestStatus: row.request_status,
      relatedDefectId: row.related_defect_id,
      createdAt: row.created_at
    }));

    const confirmations = db.project.prepare(`
      SELECT id, confirmation_type, client_name, status, note, signed_at, created_at
      FROM client_confirmations
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(projectId).map((row) => ({
      confirmationId: row.id,
      confirmationType: row.confirmation_type,
      clientName: row.client_name,
      status: row.status,
      note: row.note,
      signedAt: row.signed_at,
      createdAt: row.created_at
    }));

    const tokens = db.project.prepare(`
      SELECT id, client_name, token, expires_at, status, created_at
      FROM client_portal_tokens
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(projectId).map((row) => ({
      tokenId: row.id,
      clientName: row.client_name,
      token: row.token,
      expiresAt: row.expires_at,
      status: row.status,
      createdAt: row.created_at,
      shareStatusKo: '고객 공유 링크 준비 중'
    }));

    return {
      snapshotDate: today,
      projectSummary: {
        projectId,
        customerName,
        siteName,
        projectName: contractView.projectName,
        contractAmount: contractView.contractAmount || estimateView.totalCustomerAmount,
        startDate: contractView.startDate,
        expectedEndDate: contractView.endDate,
        currentStatusKo: schedule?.status || context.contract?.status || '진행 상태 확인 필요',
        nextProcessKo: nextSchedule?.process_name || '다음 예정 공정 없음',
        managerContactKo: '담당자 연락처 등록 예정'
      },
      estimateView,
      contractView,
      scheduleView: {
        scheduleId: schedule?.id || null,
        scheduleName: schedule?.schedule_name || '공정표 미생성',
        todayProcessKo: todaySchedule?.process_name || '오늘 공정 없음',
        nextProcessKo: nextSchedule?.process_name || '다음 예정 공정 없음',
        progressRate: scheduleItems.length ? Math.round((completedItems / scheduleItems.length) * 100) : 0,
        delayNoticeKo: scheduleItems.some((item) => String(item.status || '').toUpperCase().includes('DELAY')) ? '일정 조정 필요' : '일정 안내 없음',
        items: scheduleItems.map((item) => ({
          processName: item.process_name,
          startDate: item.start_date,
          endDate: item.end_date,
          durationDays: Number(item.duration_days || 0),
          status: item.status
        }))
      },
      progressView: { reports: progressReports, emptyMessageKo: progressReports.length ? '' : '아직 공유할 공사 진행 기록이 없습니다.' },
      paymentView: { payments, emptyMessageKo: payments.length ? '' : '결제 일정 데이터가 없습니다.' },
      changeOrderView: { changeOrders, emptyMessageKo: changeOrders.length ? '' : '승인 대기 추가공사가 없습니다.' },
      inspectionView: { inspectionResults, emptyMessageKo: inspectionResults.length ? '' : '공유된 검수 결과가 없습니다.' },
      defectView: { defectRequests, emptyMessageKo: defectRequests.length ? '' : '접수된 하자 요청이 없습니다.' },
      completionView: { confirmations, emptyMessageKo: confirmations.length ? '' : '완료 확인 기록이 없습니다.' },
      tokenView: { tokens, shareStatusKo: '고객 공유 링크 준비 중' },
      customerSafe: true
    };
  }

  function generateClientPortalToken({ projectId, clientName = '고객', daysValid = 30 } = {}) {
    const context = resolveClientPortalContext({ projectId });
    const safeProjectId = context.projectId || projectId || 'CLIENT-PORTAL-DEMO';
    const createdAt = nowIso();
    const expires = new Date(createdAt);
    expires.setDate(expires.getDate() + Number(daysValid || 30));
    const tokenId = `CLIENT-TOKEN-${safeProjectId}-${Date.now()}`;
    const token = `portal_${safeProjectId}_${Math.random().toString(36).slice(2, 12)}`;
    db.project.prepare(`
      INSERT INTO client_portal_tokens (
        id, project_id, client_name, token, expires_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tokenId, safeProjectId, clientName || context.client?.customer_name_ko || context.contract?.customer_name || '고객', token, expires.toISOString(), 'ACTIVE', createdAt);
    return { tokenId, token, projectId: safeProjectId, shareStatusKo: '고객 공유 링크 준비 중', clientPortalData: getClientPortalData({ projectId: safeProjectId }) };
  }

  function confirmClientContract({ projectId, contractId = null, clientName = '고객', signatureText = '계약 내용을 확인했습니다.' } = {}) {
    const context = resolveClientPortalContext({ projectId });
    const safeProjectId = context.projectId || projectId;
    const safeContractId = contractId || context.contract?.contract_id || 'NO_CONTRACT';
    const createdAt = nowIso();
    const confirmationId = `CLIENT-CONFIRM-CONTRACT-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO client_confirmations (
        id, project_id, confirmation_type, client_name, status, note, signed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(confirmationId, safeProjectId, 'CONTRACT_CONFIRMED', clientName, 'CONFIRMED', signatureText, createdAt, createdAt);
    createCommunicationDraft({
      messageType: 'CLIENT_CONTRACT_NOTICE',
      relatedEntityType: 'Contract',
      relatedEntityId: safeContractId,
      targetType: 'CLIENT',
      targetName: clientName,
      status: 'SENT',
      createdAt,
      force: true
    });
    return { confirmationId, clientPortalData: getClientPortalData({ projectId: safeProjectId }) };
  }

  function respondClientChangeOrder({ projectId, changeOrderId, clientName = '고객', responseStatus = 'APPROVED', question = '' } = {}) {
    const changeOrder = db.project.prepare('SELECT * FROM change_orders WHERE change_order_id = ?').get(changeOrderId);
    if (!changeOrder) throw new Error(`Change order not found: ${changeOrderId}`);
    const safeProjectId = projectId || changeOrder.project_id;
    const normalized = String(responseStatus || 'APPROVED').toUpperCase();
    const createdAt = nowIso();
    const responseId = `CLIENT-CO-RESP-${changeOrderId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO client_change_order_responses (
        id, project_id, change_order_id, client_name, response_status, question, responded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(responseId, safeProjectId, changeOrderId, clientName, normalized, question || '', createdAt, createdAt);
    db.project.prepare(`
      UPDATE change_orders
      SET customer_approval_status = ?, signature_status = ?, updated_at = ?
      WHERE change_order_id = ?
    `).run(normalized, normalized === 'APPROVED' ? 'CLIENT_CONFIRMED' : 'CLIENT_RESPONSE_RECORDED', createdAt, changeOrderId);
    if (normalized === 'APPROVED' && Number(changeOrder.additional_amount || 0) > 0) {
      const context = resolveClientPortalContext({ projectId: safeProjectId });
      const contractId = context.contract?.contract_id || `CO-${changeOrderId}`;
      db.project.prepare(`
        INSERT OR REPLACE INTO customer_payments (
          payment_id, contract_id, estimate_id, project_id, customer_name, site_name,
          payment_type, due_date, scheduled_amount, actual_received_date,
          actual_received_amount, payment_status, notes_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `PAY-CLIENT-CO-${changeOrderId}`,
        contractId,
        context.estimateId || safeProjectId,
        safeProjectId,
        clientName,
        changeOrder.site_name_ko,
        '추가공사',
        createdAt.slice(0, 10),
        Number(changeOrder.additional_amount || 0),
        null,
        0,
        'SCHEDULED',
        '고객 승인 추가공사 수금 예정',
        createdAt,
        createdAt
      );
      syncCashflowSnapshot(createdAt);
    }
    createCommunicationDraft({
      messageType: 'CLIENT_CHANGE_ORDER_APPROVAL',
      relatedEntityType: 'ChangeOrder',
      relatedEntityId: changeOrderId,
      targetType: 'CLIENT',
      targetName: clientName,
      status: 'SENT',
      createdAt,
      force: true
    });
    return { responseId, clientPortalData: getClientPortalData({ projectId: safeProjectId }) };
  }

  function createClientDefectRequest({ projectId, clientName = '고객', defectLocationKo = '위치 확인 필요', defectContentKo = '하자 내용 확인 필요', photoPath = '', urgent = false, contactTimeKo = '연락 가능 시간 확인 필요' } = {}) {
    const context = resolveClientPortalContext({ projectId });
    const safeProjectId = context.projectId || projectId || 'CLIENT-PORTAL-DEMO';
    const createdAt = nowIso();
    const requestId = `CLIENT-DEFECT-${safeProjectId}-${Date.now()}`;
    const defectResult = createDefectReport({
      projectId: safeProjectId,
      siteNameKo: context.contract?.site_name || context.estimate?.site_name || '현장',
      defectLocationKo,
      defectTypeKo: defectContentKo,
      severity: urgent ? 'HIGH' : 'MEDIUM',
      rootCauseKo: '고객 접수 - 원인 확인 필요',
      estimatedCost: 0,
      managerKo: '고객센터',
      actor: 'CEO'
    });
    db.project.prepare(`
      INSERT INTO client_defect_requests (
        id, project_id, client_name, defect_location_ko, defect_content_ko,
        photo_path, urgent, contact_time_ko, request_status, related_defect_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(requestId, safeProjectId, clientName, defectLocationKo, defectContentKo, photoPath || '', urgent ? 1 : 0, contactTimeKo, 'RECEIVED', defectResult.defectId, createdAt, createdAt);
    if (urgent) {
      upsertCeoDecisionItem({
        decisionId: `CEO-CLIENT-DEFECT-${requestId}`,
        sourceModule: 'CLIENT_PORTAL',
        entityType: 'DefectRequest',
        entityId: requestId,
        decisionType: 'URGENT_DEFECT',
        titleKo: '고객 긴급 하자 접수',
        projectId: safeProjectId,
        siteNameKo: context.contract?.site_name || context.estimate?.site_name || safeProjectId,
        financialImpact: 0,
        riskLevel: 'RED',
        requiredActionKo: '현장 확인 및 고객 안내',
        status: 'PENDING'
      }, createdAt);
      upsertRedAlertEvent({
        redAlertId: `RED-CLIENT-DEFECT-${requestId}`,
        sourceModule: 'CLIENT_PORTAL',
        entityId: requestId,
        projectId: safeProjectId,
        titleKo: '고객 긴급 하자 접수',
        reasonKo: defectContentKo,
        severity: 'RED',
        blockingRequired: false
      }, createdAt);
    }
    return { requestId, defectId: defectResult.defectId, clientPortalData: getClientPortalData({ projectId: safeProjectId }) };
  }

  function saveClientCompletionConfirmation({ projectId, clientName = '고객', confirmationType = 'COMPLETION', status = 'CONFIRMED', note = '완료 확인' } = {}) {
    const context = resolveClientPortalContext({ projectId });
    const safeProjectId = context.projectId || projectId || 'CLIENT-PORTAL-DEMO';
    const normalizedStatus = String(status || 'CONFIRMED').toUpperCase() === 'REVISION_REQUESTED' ? 'REVISION_REQUESTED' : 'CONFIRMED';
    const createdAt = nowIso();
    const confirmationId = `CLIENT-CONFIRM-${safeProjectId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO client_confirmations (
        id, project_id, confirmation_type, client_name, status, note, signed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(confirmationId, safeProjectId, confirmationType, clientName, normalizedStatus, note || '', normalizedStatus === 'CONFIRMED' ? createdAt : null, createdAt);
    if (normalizedStatus === 'REVISION_REQUESTED') {
      upsertCeoDecisionItem({
        decisionId: `CEO-CLIENT-COMPLETION-${confirmationId}`,
        sourceModule: 'CLIENT_PORTAL',
        entityType: 'CompletionConfirmation',
        entityId: confirmationId,
        decisionType: 'REVISION_REQUESTED',
        titleKo: '고객 완료 보완 요청',
        projectId: safeProjectId,
        siteNameKo: context.contract?.site_name || context.estimate?.site_name || safeProjectId,
        financialImpact: 0,
        riskLevel: 'ORANGE',
        requiredActionKo: '보완 요청 확인',
        status: 'PENDING'
      }, createdAt);
    }
    return { confirmationId, clientPortalData: getClientPortalData({ projectId: safeProjectId }) };
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

  function seedDesignBoardTemplates() {
    const createdAt = nowIso();
    const insert = db.project.prepare(`
      INSERT OR REPLACE INTO design_board_templates (
        id, template_name, typography_json, spacing_json, grid_style, image_ratio,
        section_ordering_json, background_style, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    BOARD_TEMPLATES.forEach((template) => {
      insert.run(
        template.id,
        template.templateName,
        toJson(template.typography),
        toJson(template.spacing),
        template.gridStyle,
        template.imageRatio,
        toJson(template.sectionOrdering),
        template.backgroundStyle,
        1,
        createdAt,
        createdAt
      );
    });
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

  function safeDivide(numerator, denominator) {
    const bottom = Number(denominator || 0);
    if (bottom === 0) return 0;
    return Number((Number(numerator || 0) / bottom).toFixed(4));
  }

  function getAnalyticsEstimateRows() {
    return [
      ...db.project.prepare("SELECT id, customer_name, site_name, revenue, total_cost, expected_margin, expected_margin_rate, pce_decision, branch_id, created_at, '욕실' AS project_type_ko FROM bathroom_estimates").all(),
      ...db.project.prepare("SELECT id, customer_name, site_name, revenue, total_cost, expected_margin, expected_margin_rate, pce_decision, branch_id, created_at, '주방' AS project_type_ko FROM kitchen_estimates").all(),
      ...db.project.prepare("SELECT id, customer_name, site_name, revenue, total_cost, expected_margin, expected_margin_rate, pce_decision, branch_id, created_at, '전체' AS project_type_ko FROM full_remodeling_estimates").all()
    ];
  }

  function getAnalyticsEstimateItems() {
    return [
      ...db.project.prepare("SELECT estimate_id, category, item_name, customer_total, internal_total, margin, margin_rate, '욕실' AS project_type_ko FROM bathroom_estimate_items").all(),
      ...db.project.prepare("SELECT estimate_id, category, item_name, customer_total, internal_total, margin, margin_rate, '주방' AS project_type_ko FROM kitchen_estimate_items").all(),
      ...db.project.prepare("SELECT estimate_id, category, item_name, customer_total, internal_total, margin, margin_rate, '전체' AS project_type_ko FROM full_remodeling_estimate_items").all()
    ];
  }

  function sumBy(rows, keyFn, valueFn) {
    const map = new Map();
    rows.forEach((row) => {
      const key = keyFn(row);
      const current = map.get(key) || { key, count: 0, total: 0, cost: 0, margin: 0 };
      const value = valueFn(row);
      current.count += 1;
      current.total += Number(value.total || 0);
      current.cost += Number(value.cost || 0);
      current.margin += Number(value.margin || 0);
      map.set(key, current);
    });
    return Array.from(map.values());
  }

  function riskLevelFromScore(score) {
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  }

  function buildAnalyticsPrediction({ type, score, confidence, recommendationKo, payload = {}, createdAt = nowIso() }) {
    const riskLevel = riskLevelFromScore(score);
    const id = `ANALYTICS-PRED-${type}-${createdAt.slice(0, 10)}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO analytics_predictions (
        id, prediction_type, risk_level, confidence_score, recommendation_ko,
        payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM analytics_predictions WHERE id = ?), ?))
    `).run(id, type, riskLevel, Number(confidence || 0), recommendationKo, toJson(payload), id, createdAt);
    return { id, predictionType: type, riskLevel, confidenceScore: Number(confidence || 0), recommendationKo, payload };
  }

  function getAnalyticsSummary(createdAt = nowIso()) {
    const estimates = getAnalyticsEstimateRows();
    const closings = db.project.prepare('SELECT * FROM project_closing_snapshots ORDER BY updated_at DESC').all();
    const revenue = estimates.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const cost = estimates.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
    const margin = revenue - cost;
    const averageMarginRate = safeDivide(margin, revenue);
    const cashflow = db.project.prepare('SELECT * FROM cashflow_snapshots ORDER BY created_at DESC LIMIT 1').get() || syncCashflowSnapshot(createdAt);
    const lossProcesses = db.project.prepare('SELECT process_name_ko, reason_ko FROM repeated_loss_processes ORDER BY created_at DESC LIMIT 3').all();
    const branchSummary = getFranchiseSummary();
    const topProject = estimates.slice().sort((a, b) => Number(b.expected_margin || 0) - Number(a.expected_margin || 0))[0] || null;
    const cashflowRiskScore = Number(cashflow?.seven_day_net_cashflow || 0) < 0 ? 85 : Number(cashflow?.today_net_cashflow || 0) < 0 ? 65 : 20;
    return {
      expectedNetProfit: margin,
      averageMarginRate,
      cashflowRiskLevel: riskLevelFromScore(cashflowRiskScore),
      repeatedLossProcessKo: lossProcesses[0]?.process_name_ko || '데이터 없음',
      riskyBranchCount: branchSummary.lowMarginBranchCount || 0,
      topProfitProjectKo: topProject?.site_name || topProject?.id || '데이터 없음',
      aiRiskPredictionKo: cashflowRiskScore >= 80 ? '7일 현금흐름 위험 높음' : averageMarginRate < 0.25 ? '평균 마진율 방어 필요' : '현재 위험 낮음',
      completedProjectCount: closings.length
    };
  }

  function getAnalyticsCenterData() {
    const createdAt = nowIso();
    const estimates = getAnalyticsEstimateRows();
    const items = getAnalyticsEstimateItems();
    const closings = db.project.prepare('SELECT * FROM project_closing_snapshots ORDER BY updated_at DESC').all();
    const defects = db.project.prepare('SELECT * FROM defect_reports ORDER BY created_at DESC').all();
    const attendance = db.project.prepare('SELECT * FROM crew_attendance_logs ORDER BY created_at DESC').all();
    const customerPayments = db.project.prepare('SELECT * FROM customer_payments ORDER BY due_date').all();
    const vendorPayments = db.project.prepare('SELECT * FROM vendor_payments ORDER BY due_date').all();
    const leads = db.project.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    const pipeline = db.project.prepare('SELECT * FROM sales_pipeline_metrics ORDER BY month_key DESC LIMIT 12').all();
    const vendorHistory = db.master.prepare('SELECT * FROM material_price_history ORDER BY recorded_at DESC, created_at DESC').all();
    const vendorScores = db.master.prepare('SELECT * FROM vendor_reliability_scores ORDER BY vendor_score DESC, updated_at DESC').all();
    const franchiseData = getFranchiseCenterData();

    const totalRevenue = estimates.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const totalCost = estimates.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
    const totalMargin = totalRevenue - totalCost;
    const averageMarginRate = safeDivide(totalMargin, totalRevenue);

    const processProfitability = sumBy(
      items,
      (row) => row.category || '미분류',
      (row) => ({ total: row.customer_total, cost: row.internal_total, margin: row.margin })
    ).map((row) => ({
      processNameKo: row.key,
      revenue: row.total,
      cost: row.cost,
      margin: row.margin,
      marginRate: safeDivide(row.margin, row.total),
      itemCount: row.count
    })).sort((a, b) => a.marginRate - b.marginRate);

    const projectTypeProfitability = sumBy(
      estimates,
      (row) => row.project_type_ko,
      (row) => ({ total: row.revenue, cost: row.total_cost, margin: Number(row.revenue || 0) - Number(row.total_cost || 0) })
    ).map((row) => ({
      projectTypeKo: row.key,
      revenue: row.total,
      cost: row.cost,
      margin: row.margin,
      marginRate: safeDivide(row.margin, row.total),
      estimateCount: row.count
    })).sort((a, b) => b.margin - a.margin);

    const monthlyTrend = sumBy(
      estimates,
      (row) => String(row.created_at || createdAt).slice(0, 7),
      (row) => ({ total: row.revenue, cost: row.total_cost, margin: Number(row.revenue || 0) - Number(row.total_cost || 0) })
    ).map((row) => ({
      monthKey: row.key,
      revenue: row.total,
      cost: row.cost,
      margin: row.margin,
      marginRate: safeDivide(row.margin, row.total)
    })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const regionTrend = sumBy(
      estimates,
      (row) => String(row.site_name || '지역 미분류').split(' ')[0] || '지역 미분류',
      (row) => ({ total: row.revenue, cost: row.total_cost, margin: Number(row.revenue || 0) - Number(row.total_cost || 0) })
    ).map((row) => ({
      regionKo: row.key,
      revenue: row.total,
      cost: row.cost,
      margin: row.margin,
      marginRate: safeDivide(row.margin, row.total)
    })).sort((a, b) => b.margin - a.margin);

    const topProfitProjects = estimates.slice()
      .map((row) => ({
        estimateId: row.id,
        projectTypeKo: row.project_type_ko,
        siteName: row.site_name,
        revenue: Number(row.revenue || 0),
        cost: Number(row.total_cost || 0),
        margin: Number(row.revenue || 0) - Number(row.total_cost || 0),
        marginRate: Number(row.expected_margin_rate || safeDivide(Number(row.revenue || 0) - Number(row.total_cost || 0), row.revenue))
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);

    const teamRows = sumBy(
      attendance,
      (row) => row.affiliation_ko || row.role_ko || '팀 미분류',
      (row) => ({ total: row.work_hours, cost: row.labor_cost, margin: 0 })
    ).map((row) => {
      const teamDefects = defects.filter((defect) => String(defect.manager_ko || '').includes(row.key)).length;
      return {
        teamNameKo: row.key,
        attendanceCount: row.count,
        workHours: row.total,
        laborCost: row.cost,
        productivityAmountPerHour: safeDivide(Math.max(0, totalMargin), Math.max(1, row.total)),
        scheduleComplianceRate: closings.length ? safeDivide(closings.filter((closing) => Number(closing.schedule_variance_days || 0) <= 0).length, closings.length) : 0,
        defectRate: safeDivide(teamDefects, Math.max(1, row.count)),
        averageMarginRate
      };
    }).sort((a, b) => b.productivityAmountPerHour - a.productivityAmountPerHour);

    const vendorPriceGroups = sumBy(
      vendorHistory,
      (row) => row.vendor_name || '업체 미등록',
      (row) => ({ total: row.actual_unit_price || row.quoted_unit_price, cost: 0, margin: 0 })
    );
    const vendorAnalytics = vendorScores.map((score) => {
      const priceGroup = vendorPriceGroups.find((row) => row.key === score.vendor_name);
      return {
        vendorName: score.vendor_name,
        averageUnitPrice: priceGroup ? Math.round(priceGroup.total / Math.max(1, priceGroup.count)) : 0,
        onTimeRate: Number(score.on_time_rate || 0),
        defectCount: Number(score.defect_count || 0),
        shortageCount: Number(score.shortage_count || 0),
        priceVarianceRate: Number(score.price_variance_rate || 0),
        vendorScore: Number(score.vendor_score || 0),
        reliabilityLevel: score.reliability_level,
        recommendationKo: Number(score.vendor_score || 0) >= 80 ? '추천 업체' : Number(score.vendor_score || 0) < 60 ? '위험 업체' : '주의 관찰'
      };
    }).sort((a, b) => b.vendorScore - a.vendorScore);

    const latestPipeline = pipeline[0] || null;
    const wonLeadCount = leads.filter((row) => row.consultation_status === 'WON').length;
    const lostLeadCount = leads.filter((row) => row.consultation_status === 'LOST').length;
    const conversionAnalytics = {
      totalLeads: latestPipeline?.total_leads || leads.length,
      visitConversionRate: latestPipeline ? latestPipeline.contact_conversion_rate : safeDivide(leads.filter((row) => ['VISIT_SCHEDULED', 'VISITED', 'ESTIMATE_SENT', 'NEGOTIATING', 'WON'].includes(row.consultation_status)).length, leads.length),
      estimateConversionRate: latestPipeline ? latestPipeline.estimate_conversion_rate : safeDivide(leads.filter((row) => ['ESTIMATE_SENT', 'NEGOTIATING', 'WON'].includes(row.consultation_status)).length, leads.length),
      contractConversionRate: latestPipeline ? latestPipeline.contract_conversion_rate : safeDivide(wonLeadCount, leads.length),
      averageContractAmount: safeDivide(totalRevenue, Math.max(1, estimates.length)),
      lostLeadCount,
      highProfitClientTypeKo: '예산 충분 / 공사범위 명확',
      lowProfitClientTypeKo: '최저가 중심 / 잦은 범위 변경'
    };

    const monthlyCash = sumBy(
      [...customerPayments.map((row) => ({ ...row, cashKind: 'IN' })), ...vendorPayments.map((row) => ({ ...row, cashKind: 'OUT' }))],
      (row) => String(row.due_date || createdAt).slice(0, 7),
      (row) => ({ total: row.cashKind === 'IN' ? row.scheduled_amount : 0, cost: row.cashKind === 'OUT' ? row.scheduled_amount : 0, margin: 0 })
    ).map((row) => ({
      monthKey: row.key,
      expectedInflow: row.total,
      expectedOutflow: row.cost,
      expectedNetCashflow: row.total - row.cost
    })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const receivableAmount = customerPayments.reduce((sum, row) => sum + Math.max(0, Number(row.scheduled_amount || 0) - Number(row.actual_received_amount || 0)), 0);
    const payableAmount = vendorPayments.reduce((sum, row) => sum + Math.max(0, Number(row.scheduled_amount || 0) - Number(row.actual_paid_amount || 0)), 0);
    const overdueCustomers = customerPayments.filter((row) => row.payment_status === 'OVERDUE').map((row) => ({ customerName: row.customer_name, amount: Math.max(0, Number(row.scheduled_amount || 0) - Number(row.actual_received_amount || 0)), dueDate: row.due_date }));

    const defectByProcess = sumBy(
      defects,
      (row) => row.defect_type_ko || '하자 유형 미분류',
      (row) => ({ total: 1, cost: row.estimated_cost, margin: 0 })
    ).map((row) => ({
      defectTypeKo: row.key,
      occurrenceCount: row.count,
      totalDefectCost: row.cost,
      averageDefectCost: Math.round(row.cost / Math.max(1, row.count)),
      defectRate: safeDivide(row.count, Math.max(1, estimates.length))
    })).sort((a, b) => b.totalDefectCost - a.totalDefectCost);

    const branchComparison = (franchiseData.branchMetrics || []).map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      revenue: row.totalRevenue,
      cost: row.totalCost,
      marginRate: row.averageMarginRate,
      defectCount: row.defectCount || 0,
      cashflow: row.cashflow || 0,
      conversionRate: row.contractConversionRate || 0,
      pceBlockRate: safeDivide(row.pceBlockCount || 0, Math.max(1, row.estimateCount || 0)),
      averageDurationDays: row.averageDurationDays || 0,
      customerSatisfactionKo: '데이터 수집 예정',
      statusKo: Number(row.averageMarginRate || 0) < 0.25 && Number(row.averageMarginRate || 0) > 0 ? '본사 기준 미달' : '정상'
    }));

    const cashRiskScore = monthlyCash.some((row) => row.expectedNetCashflow < 0) || receivableAmount > payableAmount * 2 ? 80 : 25;
    const marginRiskScore = averageMarginRate > 0 && averageMarginRate < 0.25 ? 75 : 20;
    const defectRiskScore = defectByProcess.some((row) => row.occurrenceCount >= 3) ? 70 : 25;
    const branchRiskScore = branchComparison.some((row) => row.statusKo === '본사 기준 미달') ? 70 : 25;
    const vendorPriceRiskScore = db.master.prepare("SELECT COUNT(*) AS count FROM vendor_price_alerts WHERE status = 'OPEN' AND severity IN ('HIGH', 'CRITICAL')").get().count > 0 ? 75 : 25;
    const predictions = [
      buildAnalyticsPrediction({ type: 'MONTHLY_REVENUE', score: marginRiskScore, confidence: estimates.length ? 0.72 : 0.35, recommendationKo: averageMarginRate < 0.25 ? '저마진 견적 차단과 가격 보정이 필요합니다.' : '현재 견적 마진 구조를 유지하세요.', payload: { expectedRevenue: totalRevenue, averageMarginRate }, createdAt }),
      buildAnalyticsPrediction({ type: 'CASHFLOW_RISK', score: cashRiskScore, confidence: customerPayments.length || vendorPayments.length ? 0.78 : 0.3, recommendationKo: cashRiskScore >= 80 ? '7일 현금흐름과 미수금을 먼저 회수하세요.' : '현금흐름 위험은 낮습니다.', payload: { receivableAmount, payableAmount }, createdAt }),
      buildAnalyticsPrediction({ type: 'DEFECT_RISK', score: defectRiskScore, confidence: defects.length ? 0.68 : 0.28, recommendationKo: defectRiskScore >= 70 ? '반복 하자 공정의 검수 체크리스트를 강화하세요.' : '하자 위험은 낮습니다.', payload: { topDefects: defectByProcess.slice(0, 3) }, createdAt }),
      buildAnalyticsPrediction({ type: 'BRANCH_RISK', score: branchRiskScore, confidence: branchComparison.length ? 0.65 : 0.25, recommendationKo: branchRiskScore >= 70 ? '본사 기준 미달 지점의 PCE 정책과 견적 단가를 재점검하세요.' : '지점 위험은 낮습니다.', payload: { riskyBranches: branchComparison.filter((row) => row.statusKo === '본사 기준 미달') }, createdAt }),
      buildAnalyticsPrediction({ type: 'VENDOR_PRICE_RISK', score: vendorPriceRiskScore, confidence: vendorHistory.length ? 0.7 : 0.25, recommendationKo: vendorPriceRiskScore >= 70 ? '단가 상승 업체의 대체 업체를 검토하세요.' : '단가 상승 위험은 낮습니다.', payload: { vendorCount: vendorAnalytics.length }, createdAt })
    ];

    const summary = {
      totalRevenue,
      totalCost,
      totalMargin,
      averageMarginRate,
      projectCount: estimates.length,
      cashflowRiskLevel: predictions.find((row) => row.predictionType === 'CASHFLOW_RISK')?.riskLevel || 'LOW',
      riskyBranchCount: branchComparison.filter((row) => row.statusKo === '본사 기준 미달').length,
      repeatedLossProcessKo: processProfitability[0]?.processNameKo || '데이터 없음',
      topProfitProjectKo: topProfitProjects[0]?.siteName || '데이터 없음'
    };

    db.project.prepare(`
      INSERT OR REPLACE INTO analytics_snapshots (
        id, snapshot_date, total_revenue, total_cost, total_margin,
        average_margin_rate, kpi_payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`ANALYTICS-SNAPSHOT-${createdAt.slice(0, 10)}`, createdAt.slice(0, 10), totalRevenue, totalCost, totalMargin, averageMarginRate, toJson(summary), createdAt);

    return {
      snapshotDate: createdAt.slice(0, 10),
      summary,
      profitAnalytics: {
        totalRevenue,
        totalCost,
        totalMargin,
        averageMarginRate,
        processProfitability,
        projectTypeProfitability,
        monthlyTrend,
        regionTrend,
        topProfitProjects,
        repeatedLossProcesses: db.project.prepare('SELECT * FROM repeated_loss_processes ORDER BY created_at DESC LIMIT 10').all(),
        estimateVsActual: db.project.prepare('SELECT * FROM estimate_vs_actual ORDER BY created_at DESC LIMIT 10').all()
      },
      teamProductivity: {
        teams: teamRows,
        emptyMessageKo: teamRows.length ? '' : '출역/노무 데이터가 없습니다.'
      },
      vendorAnalytics: {
        vendors: vendorAnalytics,
        topRecommended: vendorAnalytics.filter((row) => row.recommendationKo === '추천 업체').slice(0, 5),
        riskyVendors: vendorAnalytics.filter((row) => row.recommendationKo === '위험 업체').slice(0, 5),
        priceTrend: vendorHistory.slice(0, 20)
      },
      conversionAnalytics,
      cashflowAnalytics: {
        monthlyCash,
        receivableAmount,
        payableAmount,
        overdueCustomers,
        riskKo: cashRiskScore >= 80 ? '현금 부족 위험' : '현금흐름 안정'
      },
      defectAnalytics: {
        defectByProcess,
        topRiskProcesses: defectByProcess.slice(0, 5),
        averageDefectCost: defects.length ? Math.round(defects.reduce((sum, row) => sum + Number(row.estimated_cost || 0), 0) / defects.length) : 0
      },
      branchComparison: {
        branches: branchComparison,
        topBranches: branchComparison.slice().sort((a, b) => Number(b.marginRate || 0) - Number(a.marginRate || 0)).slice(0, 5),
        riskyBranches: branchComparison.filter((row) => row.statusKo === '본사 기준 미달')
      },
      aiPredictions: predictions,
      emptyState: estimates.length === 0 && closings.length === 0,
      emptyMessageKo: '분석할 견적/프로젝트 데이터가 없습니다.'
    };
  }

  function exportAnalyticsReport({ exportType = 'PDF', actor = 'CEO' } = {}) {
    const createdAt = nowIso();
    const type = String(exportType || 'PDF').toUpperCase() === 'XLSX' ? 'XLSX' : 'PDF';
    const data = getAnalyticsCenterData();
    fs.mkdirSync(reportExportDir, { recursive: true });
    const fileName = `analytics_report_${Date.now()}.${type === 'XLSX' ? 'xlsx' : 'pdf'}`;
    const filePath = path.join(reportExportDir, fileName);
    const body = {
      title: type === 'XLSX' ? 'Analytics Excel Export Placeholder' : 'Analytics PDF Export Placeholder',
      actor,
      createdAt,
      summary: data.summary,
      predictions: data.aiPredictions
    };
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
    const exportId = `ANALYTICS-EXPORT-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO analytics_export_logs (
        id, export_type, file_path, status, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(exportId, type, filePath, 'READY', createdAt);
    return { exportId, exportType: type, filePath, status: 'READY' };
  }

  const AI_AGENT_DEFINITIONS = [
    { agentType: 'PROFIT_DEFENSE', agentName: 'Profit Defense Agent', riskThreshold: 0.25 },
    { agentType: 'CASHFLOW_RISK', agentName: 'Cashflow Risk Agent', riskThreshold: 0 },
    { agentType: 'SCHEDULE_DELAY', agentName: 'Schedule Delay Agent', riskThreshold: 1 },
    { agentType: 'VENDOR_RISK', agentName: 'Vendor Risk Agent', riskThreshold: 0.15 },
    { agentType: 'DEFECT_PREVENTION', agentName: 'Defect Prevention Agent', riskThreshold: 2 },
    { agentType: 'ESTIMATE_CALIBRATION', agentName: 'Estimate Calibration Agent', riskThreshold: 0.1 },
    { agentType: 'CLIENT_COMMUNICATION', agentName: 'Client Communication Agent', riskThreshold: 1 },
    { agentType: 'FRANCHISE_MONITORING', agentName: 'Franchise Monitoring Agent', riskThreshold: 0.25 }
  ];

  function aiTaskPriorityRank(priority) {
    return priority === 'RED' ? 0 : priority === 'ORANGE' ? 1 : priority === 'YELLOW' ? 2 : 3;
  }

  function aiTaskId(agentType, taskType, relatedEntityId) {
    return `AI-${agentType}-${taskType}-${String(relatedEntityId || 'GLOBAL')}`.replace(/[^A-Z0-9_-]/gi, '-').slice(0, 180);
  }

  function ensureAIAgents(createdAt = nowIso()) {
    AI_AGENT_DEFINITIONS.forEach((agent) => {
      db.project.prepare(`
        INSERT OR IGNORE INTO ai_agents (
          id, agent_name, agent_type, is_enabled, risk_threshold, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(`AGENT-${agent.agentType}`, agent.agentName, agent.agentType, 1, agent.riskThreshold, createdAt, createdAt);
    });
    return db.project.prepare('SELECT * FROM ai_agents ORDER BY agent_name').all();
  }

  function writeAILearningLog({ agentType, eventType, inputSummary, detectedPattern, generatedAction, finalResult = 'PENDING_REVIEW', successScore = 0, createdAt = nowIso() }) {
    const id = `AILOG-${agentType}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.project.prepare(`
      INSERT INTO ai_learning_logs (
        id, agent_type, event_type, input_summary, detected_pattern,
        generated_action, final_result, success_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, agentType, eventType, inputSummary, detectedPattern, generatedAction, finalResult, Number(successScore || 0), createdAt);
    return id;
  }

  function upsertAITask(task, createdAt = nowIso()) {
    const id = task.id || aiTaskId(task.agentType, task.taskType, task.relatedEntityId);
    const existing = db.project.prepare('SELECT * FROM ai_task_queue WHERE id = ?').get(id);
    const status = existing?.status && !['PENDING', 'FAILED'].includes(existing.status) ? existing.status : 'PENDING';
    db.project.prepare(`
      INSERT OR REPLACE INTO ai_task_queue (
        id, agent_type, task_type, priority, related_entity_type, related_entity_id,
        detected_risk, recommendation, draft_payload_json, status,
        requires_human_approval, created_at, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      task.agentType,
      task.taskType,
      task.priority || 'NORMAL',
      task.relatedEntityType || 'GLOBAL',
      task.relatedEntityId || 'GLOBAL',
      task.detectedRisk || '',
      task.recommendation || '',
      toJson(task.draftPayload || {}),
      status,
      task.requiresHumanApproval === false ? 0 : 1,
      existing?.created_at || createdAt,
      existing?.executed_at || null
    );

    if (!existing) {
      writeAILearningLog({
        agentType: task.agentType,
        eventType: 'AI_TASK_CREATED',
        inputSummary: task.detectedRisk || '',
        detectedPattern: task.taskType,
        generatedAction: task.recommendation || '',
        createdAt
      });
    }

    const riskLevel = task.priority === 'RED' ? 'RED' : task.priority === 'ORANGE' ? 'ORANGE' : task.priority === 'YELLOW' ? 'YELLOW' : 'NORMAL';
    upsertCeoDecisionItem({
      decisionId: `CEO-${id}`,
      sourceModule: 'AI_AGENT',
      entityType: 'AITask',
      entityId: id,
      decisionType: task.taskType,
      titleKo: task.titleKo || `AI 추천: ${task.detectedRisk || task.taskType}`,
      projectId: task.projectId || task.relatedEntityId || 'GLOBAL',
      siteNameKo: task.siteNameKo || task.projectId || task.relatedEntityId || 'AI 운영 자동화',
      financialImpact: task.financialImpact || 0,
      riskLevel,
      requiredActionKo: task.requiredActionKo || 'AI 추천 검토 후 승인/반려',
      deadline: createdAt.slice(0, 10),
      payload: { aiTaskId: id, ...task.draftPayload }
    }, createdAt);

    upsertApprovalRequest({
      requestId: `APR-${id}`,
      sourceModule: 'AI_AGENT',
      entityId: id,
      projectId: task.projectId || task.relatedEntityId || 'GLOBAL',
      titleKo: task.titleKo || `AI 작업 승인 필요: ${task.taskType}`,
      amount: task.financialImpact || 0,
      reasonKo: task.detectedRisk || task.recommendation || 'AI 추천 검토',
      status: 'PENDING'
    }, createdAt);

    if (task.priority === 'RED') {
      upsertRedAlertEvent({
        redAlertId: `RED-${id}`,
        sourceModule: 'AI_AGENT',
        entityId: id,
        projectId: task.projectId || task.relatedEntityId || 'GLOBAL',
        titleKo: task.titleKo || 'AI 위험 경고',
        reasonKo: task.detectedRisk || task.recommendation || 'AI가 즉시 검토가 필요한 위험을 감지했습니다.',
        financialImpact: task.financialImpact || 0,
        blockingRequired: false,
        payload: { aiTaskId: id, ...task.draftPayload }
      }, createdAt);
    }

    return db.project.prepare('SELECT * FROM ai_task_queue WHERE id = ?').get(id);
  }

  function createAIPreventionRule(rule, createdAt = nowIso()) {
    const id = rule.id || aiTaskId('RULE', rule.sourceAgent || 'AI', rule.triggerPattern || rule.ruleName);
    db.project.prepare(`
      INSERT OR IGNORE INTO ai_prevention_rules (
        id, rule_name, trigger_pattern, recommended_action, severity,
        source_agent, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      rule.ruleName,
      rule.triggerPattern,
      rule.recommendedAction,
      rule.severity || 'YELLOW',
      rule.sourceAgent,
      rule.status || 'INACTIVE',
      createdAt
    );
    return db.project.prepare('SELECT * FROM ai_prevention_rules WHERE id = ?').get(id);
  }

  function runAIAgentAutomation({ actor = 'AI_SYSTEM', createdAt = nowIso() } = {}) {
    ensureAIAgents(createdAt);
    const enabled = new Set(db.project.prepare('SELECT agent_type FROM ai_agents WHERE is_enabled = 1').all().map((row) => row.agent_type));
    const tasks = [];
    const pushTask = (agentType, task) => {
      if (!enabled.has(agentType)) return;
      tasks.push(upsertAITask({ agentType, ...task }, createdAt));
    };

    const recentPce = db.project.prepare(`
      SELECT *
      FROM profit_decisions
      WHERE decision IN ('BLOCK', 'MODIFY')
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    recentPce.forEach((row) => {
      pushTask('PROFIT_DEFENSE', {
        taskType: row.decision === 'BLOCK' ? 'PROFIT_BLOCK_REVIEW' : 'PROFIT_MODIFY_RECOMMENDATION',
        priority: row.decision === 'BLOCK' ? 'RED' : 'ORANGE',
        relatedEntityType: 'Estimate',
        relatedEntityId: row.estimate_id,
        projectId: row.estimate_id,
        financialImpact: Math.max(0, Math.round(Number(row.revenue || 0) * 0.25 - (Number(row.revenue || 0) - Number(row.total_cost || 0) - Number(row.risk_buffer || 0)))),
        detectedRisk: `실질 마진율 ${(Number(row.real_margin || 0) * 100).toFixed(1)}%`,
        recommendation: row.decision === 'BLOCK' ? '견적 진행 차단을 유지하고 가격/범위 재설계를 검토하세요.' : '마진 30% 이상으로 회복되도록 고객가 또는 범위를 수정하세요.',
        titleKo: row.decision === 'BLOCK' ? 'AI 감지: 저마진 견적 차단' : 'AI 추천: 견적 수정 필요',
        requiredActionKo: '대표 승인 전 견적 수정/차단 판단',
        draftPayload: { source: row, action: 'PRICE_ADJUSTMENT_RECOMMENDATION' }
      });
    });

    syncPaymentSchedules(createdAt);
    updatePaymentOverdues(createdAt);
    const cashflow = syncCashflowSnapshot(createdAt);
    const overdueCustomer = db.project.prepare(`
      SELECT *
      FROM customer_payments
      WHERE payment_status = 'OVERDUE'
      ORDER BY scheduled_amount DESC, due_date ASC
      LIMIT 5
    `).all();
    if (Number(cashflow?.seven_day_net_cashflow || 0) < 0 || overdueCustomer.length) {
      pushTask('CASHFLOW_RISK', {
        taskType: 'CASHFLOW_REVIEW_REQUEST',
        priority: Number(cashflow?.seven_day_net_cashflow || 0) < 0 ? 'RED' : 'ORANGE',
        relatedEntityType: 'CashflowSnapshot',
        relatedEntityId: cashflow?.snapshot_id || `CASH-${createdAt.slice(0, 10)}`,
        projectId: 'COMPANY',
        financialImpact: Math.abs(Number(cashflow?.seven_day_net_cashflow || 0)) + overdueCustomer.reduce((sum, row) => sum + Number(row.scheduled_amount || 0), 0),
        detectedRisk: overdueCustomer.length ? `연체 입금 ${overdueCustomer.length}건 감지` : '7일 현금흐름 음수 예측',
        recommendation: '입금 리마인더 초안을 확인하고 지급 일정을 대표가 조정하세요.',
        titleKo: 'AI 감지: 현금흐름 위험',
        requiredActionKo: '입금 회수/지급 일정 검토',
        draftPayload: { cashflow, overdueCustomerIds: overdueCustomer.map((row) => row.payment_id) }
      });
    }

    const shortage = db.project.prepare(`
      SELECT *
      FROM material_receiving_logs
      WHERE missing_quantity > 0 OR damage_or_missing = 1
      ORDER BY created_at DESC
      LIMIT 5
    `).all();
    const failedInspection = db.project.prepare(`
      SELECT *
      FROM inspection_checklist_items
      WHERE result_status = 'FAIL'
      ORDER BY created_at DESC
      LIMIT 5
    `).all();
    [...shortage, ...failedInspection].slice(0, 5).forEach((row) => {
      pushTask('SCHEDULE_DELAY', {
        taskType: 'SCHEDULE_DELAY_DRAFT',
        priority: row.critical_flag || row.damage_or_missing ? 'RED' : 'ORANGE',
        relatedEntityType: row.receiving_log_id ? 'MaterialReceiving' : 'InspectionChecklistItem',
        relatedEntityId: row.receiving_log_id || row.item_id,
        projectId: row.project_id,
        financialImpact: 0,
        detectedRisk: row.receiving_log_id ? `${row.item_name_ko} 입고 부족 ${row.missing_quantity}${row.unit || ''}` : `${row.process_name_ko} 검수 FAIL`,
        recommendation: '공정표 수정 초안과 고객 일정 안내 초안을 준비하세요.',
        titleKo: 'AI Draft: 일정 지연 대응',
        requiredActionKo: '수정 공정표/지연 안내 검토',
        draftPayload: { source: row, draftType: 'REVISED_SCHEDULE_AND_NOTICE' }
      });
    });

    const vendorAlerts = db.master.prepare(`
      SELECT *
      FROM vendor_price_alerts
      WHERE status = 'OPEN'
      ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, created_at DESC
      LIMIT 5
    `).all();
    const riskyVendors = db.master.prepare(`
      SELECT *
      FROM vendor_reliability_scores
      WHERE reliability_level IN ('주의', '위험')
      ORDER BY vendor_score ASC, updated_at DESC
      LIMIT 5
    `).all();
    [...vendorAlerts, ...riskyVendors].slice(0, 5).forEach((row) => {
      pushTask('VENDOR_RISK', {
        taskType: 'VENDOR_RISK_RECOMMENDATION',
        priority: row.severity === 'CRITICAL' || row.reliability_level === '위험' ? 'RED' : 'ORANGE',
        relatedEntityType: row.alert_type ? 'VendorPriceAlert' : 'VendorReliabilityScore',
        relatedEntityId: row.id,
        projectId: 'VENDOR',
        financialImpact: Math.abs(Number(row.current_price || 0) - Number(row.previous_price || 0)),
        detectedRisk: row.alert_type ? `${row.material_name} ${row.vendor_name} 단가 변동 ${((Number(row.variance_rate || 0)) * 100).toFixed(1)}%` : `${row.vendor_name} 신뢰도 ${row.reliability_level}`,
        recommendation: '대체 업체 검토, 견적 버퍼 반영, 발주 전 경고를 승인 대기 상태로 올리세요.',
        titleKo: 'AI 추천: 협력업체 위험 대응',
        requiredActionKo: '업체 교체/버퍼 반영 승인',
        draftPayload: { source: row, action: 'VENDOR_REPLACEMENT_OR_BUFFER' }
      });
    });

    const defectGroups = db.project.prepare(`
      SELECT defect_type_ko, COUNT(*) AS occurrence_count, SUM(estimated_cost) AS estimated_cost
      FROM defect_reports
      GROUP BY defect_type_ko
      HAVING COUNT(*) >= 1
      ORDER BY COUNT(*) DESC, SUM(estimated_cost) DESC
      LIMIT 5
    `).all();
    defectGroups.forEach((row) => {
      const rule = createAIPreventionRule({
        ruleName: `${row.defect_type_ko} 예방 체크 강화`,
        triggerPattern: `DEFECT:${row.defect_type_ko}`,
        recommendedAction: '다음 현장 검수 체크리스트에 예방 항목을 추가하고 사진 확인을 강화하세요.',
        severity: Number(row.occurrence_count || 0) >= 2 ? 'RED' : 'ORANGE',
        sourceAgent: 'DEFECT_PREVENTION',
        status: 'INACTIVE'
      }, createdAt);
      pushTask('DEFECT_PREVENTION', {
        taskType: 'DEFECT_PREVENTION_RULE',
        priority: Number(row.occurrence_count || 0) >= 2 ? 'RED' : 'ORANGE',
        relatedEntityType: 'AIPreventionRule',
        relatedEntityId: rule.id,
        projectId: 'QUALITY',
        financialImpact: Number(row.estimated_cost || 0),
        detectedRisk: `${row.defect_type_ko} 하자 ${row.occurrence_count}건`,
        recommendation: rule.recommended_action,
        titleKo: 'AI 추천: 하자 예방 룰 승인',
        requiredActionKo: '예방 룰 승인/반려',
        draftPayload: { preventionRuleId: rule.id, source: row }
      });
    });

    const calibrationCandidates = db.project.prepare(`
      SELECT *
      FROM project_cost_leaks
      ORDER BY risk_score DESC, created_at DESC
      LIMIT 5
    `).all();
    const pendingCalibrationRules = db.project.prepare(`
      SELECT *
      FROM estimate_calibration_rules
      WHERE status IN ('PENDING_APPROVAL', 'TESTING')
      ORDER BY created_at DESC
      LIMIT 5
    `).all();
    [...calibrationCandidates, ...pendingCalibrationRules].slice(0, 5).forEach((row) => {
      pushTask('ESTIMATE_CALIBRATION', {
        taskType: 'ESTIMATE_CALIBRATION_DRAFT',
        priority: Number(row.risk_score || 0) >= 80 || Number(row.variance_rate || 0) >= 0.15 ? 'ORANGE' : 'YELLOW',
        relatedEntityType: row.project_id ? 'ProjectCostLeak' : 'EstimateCalibrationRule',
        relatedEntityId: row.id,
        projectId: row.project_id || row.source_project_id || 'ESTIMATE',
        financialImpact: row.variance_amount || 0,
        detectedRisk: row.category_ko || row.source_category || row.rule_type,
        recommendation: row.prevention_rule || row.reason || '다음 견적 보정 룰을 대표 승인 후 반영하세요.',
        titleKo: 'AI Draft: 견적 보정안',
        requiredActionKo: '보정 룰 테스트/승인',
        draftPayload: { source: row, action: 'CALIBRATION_RULE_DRAFT' }
      });
    });

    overdueCustomer.slice(0, 5).forEach((row) => {
      const draft = createCommunicationDraft({
        messageId: `COMM-AI-PAYMENT-${row.payment_id}`,
        messageType: 'CLIENT_PAYMENT_REQUEST',
        relatedEntityType: 'CustomerPayment',
        relatedEntityId: row.payment_id,
        targetName: row.customer_name,
        status: 'DRAFT',
        data: {
          customerName: row.customer_name,
          siteName: row.site_name,
          amountKo: formatWon(Math.max(0, Number(row.scheduled_amount || 0) - Number(row.actual_received_amount || 0))),
          dueDate: row.due_date,
          notesKo: 'AI가 연체 입금 리마인더 초안을 준비했습니다. 발송 전 대표 확인이 필요합니다.'
        },
        createdAt
      });
      pushTask('CLIENT_COMMUNICATION', {
        taskType: 'CLIENT_PAYMENT_DRAFT_REVIEW',
        priority: 'ORANGE',
        relatedEntityType: 'CommunicationMessage',
        relatedEntityId: draft.messageId,
        projectId: row.project_id,
        financialImpact: Math.max(0, Number(row.scheduled_amount || 0) - Number(row.actual_received_amount || 0)),
        detectedRisk: `${row.customer_name} ${row.payment_type} 연체`,
        recommendation: '고객 결제 요청 메시지 초안을 검토 후 수동 발송 처리하세요.',
        titleKo: 'AI Draft: 고객 결제 안내',
        requiredActionKo: '메시지 검토 후 발송 여부 결정',
        draftPayload: { communicationMessageId: draft.messageId, paymentId: row.payment_id }
      });
    });

    syncFranchiseRiskAlerts(createdAt);
    const franchiseAlerts = db.master.prepare(`
      SELECT *
      FROM franchise_risk_alerts
      WHERE status = 'OPEN'
      ORDER BY CASE severity WHEN 'RED' THEN 0 WHEN 'ORANGE' THEN 1 ELSE 2 END, created_at DESC
      LIMIT 5
    `).all();
    const blockCount = db.project.prepare("SELECT COUNT(*) AS count FROM profit_decisions WHERE decision = 'BLOCK'").get().count;
    if (franchiseAlerts.length === 0 && Number(blockCount || 0) > 0) {
      franchiseAlerts.push({ id: 'FRA-PCE-BLOCK-PATTERN', branch_id: 'HEADQUARTERS', alert_type: 'PCE_BLOCK_PATTERN', severity: 'ORANGE', title: 'PCE BLOCK 반복 패턴', description: '지점/본사 견적에서 BLOCK 패턴이 발생했습니다.' });
    }
    franchiseAlerts.forEach((row) => {
      pushTask('FRANCHISE_MONITORING', {
        taskType: 'FRANCHISE_HQ_REVIEW',
        priority: row.severity === 'RED' ? 'RED' : 'ORANGE',
        relatedEntityType: 'FranchiseRiskAlert',
        relatedEntityId: row.id,
        projectId: row.branch_id || 'HEADQUARTERS',
        detectedRisk: row.title || row.alert_type,
        recommendation: row.description || '본사 기준과 지점 운영 데이터를 검토하세요.',
        titleKo: 'AI 감지: 지점 운영 위험',
        requiredActionKo: '본사 검토/지점 개선 요청',
        draftPayload: { source: row, action: 'HQ_BRANCH_REVIEW' }
      });
    });

    insertNotification({
      level: tasks.some((task) => task.priority === 'RED') ? 'RED' : tasks.length ? 'WARNING' : 'INFO',
      messageKo: `AI 운영 자동화 점검 완료: ${tasks.length}건 작업 큐 확인`,
      relatedProjectId: 'AI_AUTOMATION',
      actionKo: actor === 'AI_SYSTEM' ? 'AI 점검' : `${actor} 점검`,
      createdAt
    });

    return { taskCount: tasks.length, tasks, summary: getAIAutomationSummary() };
  }

  function mapAITask(row) {
    return {
      ...row,
      draftPayload: fromJson(row.draft_payload_json, {}),
      requiresHumanApproval: Boolean(row.requires_human_approval),
      priorityRank: aiTaskPriorityRank(row.priority)
    };
  }

  function getAIAutomationSummary() {
    const enabledAgentCount = Number(db.project.prepare('SELECT COUNT(*) AS count FROM ai_agents WHERE is_enabled = 1').get().count || 0);
    const pendingTaskCount = Number(db.project.prepare("SELECT COUNT(*) AS count FROM ai_task_queue WHERE status = 'PENDING'").get().count || 0);
    const approvalRequiredCount = Number(db.project.prepare("SELECT COUNT(*) AS count FROM ai_task_queue WHERE status = 'PENDING' AND requires_human_approval = 1").get().count || 0);
    const redTaskCount = Number(db.project.prepare("SELECT COUNT(*) AS count FROM ai_task_queue WHERE status = 'PENDING' AND priority = 'RED'").get().count || 0);
    const preventionRuleCount = Number(db.project.prepare('SELECT COUNT(*) AS count FROM ai_prevention_rules').get().count || 0);
    const activePreventionRuleCount = Number(db.project.prepare("SELECT COUNT(*) AS count FROM ai_prevention_rules WHERE status = 'ACTIVE'").get().count || 0);
    const learningLogCount = Number(db.project.prepare('SELECT COUNT(*) AS count FROM ai_learning_logs').get().count || 0);
    return {
      enabledAgentCount,
      pendingTaskCount,
      approvalRequiredCount,
      redTaskCount,
      preventionRuleCount,
      activePreventionRuleCount,
      learningLogCount,
      displayStatusKo: pendingTaskCount ? '승인 필요 AI 작업 있음' : '대기 중인 AI 작업 없음'
    };
  }

  function getAIAutomationCenterData({ runAgents = true } = {}) {
    const createdAt = nowIso();
    ensureAIAgents(createdAt);
    if (runAgents) runAIAgentAutomation({ createdAt });
    const tasks = db.project.prepare(`
      SELECT *
      FROM ai_task_queue
      ORDER BY
        CASE priority WHEN 'RED' THEN 0 WHEN 'ORANGE' THEN 1 WHEN 'YELLOW' THEN 2 ELSE 3 END,
        CASE status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 WHEN 'EXECUTED' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 100
    `).all().map(mapAITask);
    const agents = db.project.prepare('SELECT * FROM ai_agents ORDER BY agent_name').all();
    const learningLogs = db.project.prepare('SELECT * FROM ai_learning_logs ORDER BY created_at DESC LIMIT 60').all();
    const preventionRules = db.project.prepare("SELECT * FROM ai_prevention_rules ORDER BY CASE status WHEN 'INACTIVE' THEN 0 ELSE 1 END, created_at DESC LIMIT 60").all();
    return {
      snapshotDate: createdAt.slice(0, 10),
      summary: getAIAutomationSummary(),
      agents,
      tasks,
      approvalQueue: tasks.filter((task) => task.status === 'PENDING' && task.requiresHumanApproval),
      learningLogs,
      preventionRules,
      automationLogs: learningLogs,
      emptyState: tasks.length === 0,
      emptyMessageKo: '대기 중인 AI 작업이 없습니다.'
    };
  }

  function decideAIAgentTask({ taskId, decision, actor = 'CEO', reasonKo = '' }) {
    if (!['APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'].includes(decision)) {
      throw new Error('AI task decision must be APPROVED, REJECTED, EXECUTED, or FAILED');
    }
    const createdAt = nowIso();
    const task = db.project.prepare('SELECT * FROM ai_task_queue WHERE id = ?').get(taskId);
    if (!task) throw new Error(`AI task not found: ${taskId}`);
    const payload = fromJson(task.draft_payload_json, {});

    db.project.prepare('UPDATE ai_task_queue SET status = ?, executed_at = ? WHERE id = ?').run(decision, ['EXECUTED', 'APPROVED', 'REJECTED', 'FAILED'].includes(decision) ? createdAt : null, taskId);
    db.project.prepare('UPDATE approval_requests SET status = ?, decision_reason_ko = ? WHERE request_id = ?').run(decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'PENDING', reasonKo || `${actor} ${decision}`, `APR-${taskId}`);
    db.project.prepare('UPDATE ceo_decision_queue SET status = ?, updated_at = ? WHERE decision_id = ?').run(decision, createdAt, `CEO-${taskId}`);

    if (decision === 'APPROVED' && task.task_type === 'DEFECT_PREVENTION_RULE' && payload.preventionRuleId) {
      db.project.prepare('UPDATE ai_prevention_rules SET status = ? WHERE id = ?').run('ACTIVE', payload.preventionRuleId);
    }

    if (decision === 'APPROVED' && task.task_type === 'CLIENT_PAYMENT_DRAFT_REVIEW' && payload.communicationMessageId) {
      db.project.prepare('UPDATE communication_messages SET status = ? WHERE id = ? AND status = ?').run('READY', payload.communicationMessageId, 'DRAFT');
    }

    writeAILearningLog({
      agentType: task.agent_type,
      eventType: 'HUMAN_DECISION',
      inputSummary: task.detected_risk,
      detectedPattern: task.task_type,
      generatedAction: task.recommendation,
      finalResult: `${decision}:${reasonKo || 'NO_REASON'}`,
      successScore: decision === 'APPROVED' ? 0.8 : decision === 'REJECTED' ? 0.2 : 0.5,
      createdAt
    });

    writeOperationalLog({
      actionType: `AI_TASK_${decision}`,
      actor,
      projectId: task.related_entity_id,
      messageKo: `AI 작업 ${decision}: ${task.detected_risk}`,
      actionKo: decision === 'APPROVED' ? 'AI 추천 승인' : decision === 'REJECTED' ? 'AI 추천 반려' : 'AI 작업 처리',
      level: decision === 'REJECTED' || decision === 'FAILED' ? 'WARNING' : 'INFO',
      payload: { taskId, agentType: task.agent_type, taskType: task.task_type },
      reasonKo,
      createdAt
    });

    return { taskId, decision, aiAutomationData: getAIAutomationCenterData({ runAgents: false }), dashboardData: getDashboardData() };
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
      calibrationSummary: getCalibrationSummary(),
      vendorPriceIntelligenceSummary: getVendorPriceIntelligenceSummary(),
      franchiseSummary: getFranchiseSummary(),
      analyticsSummary: getAnalyticsSummary(),
      aiAutomationSummary: getAIAutomationSummary(),
      profitAlerts,
      profitTemplates,
      estimateVsActualTop,
      repeatedDefectsTop,
      repeatedLossProcessTop,
      notificationLog
    };
  }

  function riskRank(level) {
    return level === 'RED' ? 0 : level === 'ORANGE' ? 1 : level === 'YELLOW' ? 2 : 3;
  }

  function normalizeCeoRiskLevel({ severity, decision, blockingRequired, marginRate = null }) {
    if (blockingRequired || severity === 'RED' || severity === 'BLOCKING' || decision === 'BLOCK') return 'RED';
    if (decision === 'MODIFY' || severity === 'WARNING' || severity === 'YELLOW') return 'ORANGE';
    if (marginRate != null && Number(marginRate) < 0.25) return 'ORANGE';
    return 'NORMAL';
  }

  function upsertCeoDecisionItem(item, createdAt = nowIso()) {
    db.project.prepare(`
      INSERT OR REPLACE INTO ceo_decision_queue (
        decision_id, source_module, entity_type, entity_id, decision_type,
        title_ko, project_id, site_name_ko, financial_impact, risk_level,
        required_action_ko, deadline, status, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        COALESCE((SELECT payload_json FROM ceo_decision_queue WHERE decision_id = ?), ?),
        COALESCE((SELECT created_at FROM ceo_decision_queue WHERE decision_id = ?), ?),
        ?
      )
    `).run(
      item.decisionId,
      item.sourceModule,
      item.entityType,
      item.entityId,
      item.decisionType,
      item.titleKo,
      item.projectId || 'GLOBAL',
      item.siteNameKo || item.projectId || '데이터 없음',
      Math.round(Number(item.financialImpact || 0)),
      item.riskLevel || 'NORMAL',
      item.requiredActionKo || '상세 확인',
      item.deadline || createdAt.slice(0, 10),
      item.status || 'PENDING',
      item.decisionId,
      toJson(item.payload || {}),
      item.decisionId,
      createdAt,
      createdAt
    );
  }

  function upsertApprovalRequest(item, createdAt = nowIso()) {
    db.project.prepare(`
      INSERT OR REPLACE INTO approval_requests (
        request_id, source_module, entity_id, project_id, title_ko,
        amount, reason_ko, status, created_at, approved_at, approved_by,
        rejected_at, rejected_by, decision_reason_ko
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT status FROM approval_requests WHERE request_id = ?), ?),
        COALESCE((SELECT created_at FROM approval_requests WHERE request_id = ?), ?),
        (SELECT approved_at FROM approval_requests WHERE request_id = ?),
        (SELECT approved_by FROM approval_requests WHERE request_id = ?),
        (SELECT rejected_at FROM approval_requests WHERE request_id = ?),
        (SELECT rejected_by FROM approval_requests WHERE request_id = ?),
        COALESCE((SELECT decision_reason_ko FROM approval_requests WHERE request_id = ?), ?)
      )
    `).run(
      item.requestId,
      item.sourceModule,
      item.entityId,
      item.projectId || 'GLOBAL',
      item.titleKo,
      Math.round(Number(item.amount || 0)),
      item.reasonKo || '',
      item.requestId,
      item.status || 'PENDING',
      item.requestId,
      createdAt,
      item.requestId,
      item.requestId,
      item.requestId,
      item.requestId,
      item.requestId,
      item.reasonKo || '',
    );
  }

  function upsertRedAlertEvent(item, createdAt = nowIso()) {
    db.project.prepare(`
      INSERT OR REPLACE INTO red_alert_events (
        red_alert_id, source_module, entity_id, project_id, title_ko,
        reason_ko, severity, financial_impact, blocking_required, status,
        created_at, resolved_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        COALESCE((SELECT created_at FROM red_alert_events WHERE red_alert_id = ?), ?),
        (SELECT resolved_at FROM red_alert_events WHERE red_alert_id = ?),
        ?
      )
    `).run(
      item.redAlertId,
      item.sourceModule,
      item.entityId,
      item.projectId || 'GLOBAL',
      item.titleKo,
      item.reasonKo,
      item.severity || 'RED',
      Math.round(Number(item.financialImpact || 0)),
      item.blockingRequired ? 1 : 0,
      item.status || 'ACTIVE',
      item.redAlertId,
      createdAt,
      item.redAlertId,
      toJson(item.payload || {})
    );
  }

  function syncCeoControlTower(createdAt = nowIso()) {
    runAutomationScheduler('EVENT_SWEEP_5M');

    db.project.prepare(`
      SELECT *
      FROM profit_decisions
      WHERE decision IN ('BLOCK', 'MODIFY')
      ORDER BY created_at DESC
      LIMIT 50
    `).all().forEach((row) => {
      const riskLevel = row.decision === 'BLOCK' ? 'RED' : 'ORANGE';
      upsertCeoDecisionItem({
        decisionId: `CEO-PCE-${row.id}`,
        sourceModule: 'PCE',
        entityType: 'Estimate',
        entityId: row.estimate_id,
        decisionType: row.decision,
        titleKo: row.decision === 'BLOCK' ? 'PCE BLOCK 견적' : 'PCE MODIFY 견적',
        projectId: row.estimate_id,
        financialImpact: Math.max(0, Math.round(Number(row.revenue || 0) * 0.25 - (Number(row.revenue || 0) - Number(row.total_cost || 0) - Number(row.risk_buffer || 0)))),
        riskLevel,
        requiredActionKo: row.decision === 'BLOCK' ? '차단 또는 대표 예외 승인' : '견적 수정',
        deadline: row.created_at?.slice(0, 10),
        payload: row
      }, createdAt);
      upsertApprovalRequest({
        requestId: `APR-PCE-${row.id}`,
        sourceModule: 'PCE',
        entityId: row.estimate_id,
        projectId: row.estimate_id,
        titleKo: row.decision === 'BLOCK' ? 'PCE BLOCK 예외 승인 검토' : 'PCE MODIFY 견적 수정 검토',
        amount: row.revenue,
        reasonKo: `실질 마진율 ${(Number(row.real_margin || 0) * 100).toFixed(1)}%`,
        status: 'PENDING'
      }, createdAt);
      if (row.decision === 'BLOCK') {
        upsertRedAlertEvent({
          redAlertId: `RED-PCE-${row.id}`,
          sourceModule: 'PCE',
          entityId: row.estimate_id,
          projectId: row.estimate_id,
          titleKo: 'PCE BLOCK',
          reasonKo: `실질 마진율 ${(Number(row.real_margin || 0) * 100).toFixed(1)}%로 기준 미달`,
          financialImpact: row.revenue,
          blockingRequired: true,
          payload: row
        }, createdAt);
      }
    });

    db.logs.prepare("SELECT * FROM event_triggers WHERE status = 'ACTIVE'").all().forEach((row) => {
      const riskLevel = normalizeCeoRiskLevel({ severity: row.severity, blockingRequired: Boolean(row.blocking_required) });
      upsertCeoDecisionItem({
        decisionId: `CEO-EVT-${row.trigger_id}`,
        sourceModule: row.event_category,
        entityType: 'EventTrigger',
        entityId: row.trigger_id,
        decisionType: row.event_type,
        titleKo: row.title_ko,
        projectId: row.project_id,
        financialImpact: 0,
        riskLevel,
        requiredActionKo: row.next_action_ko,
        deadline: row.detected_at?.slice(0, 10),
        payload: row
      }, createdAt);
      if (riskLevel === 'RED') {
        upsertRedAlertEvent({
          redAlertId: `RED-EVT-${row.trigger_id}`,
          sourceModule: row.event_category,
          entityId: row.trigger_id,
          projectId: row.project_id,
          titleKo: row.title_ko,
          reasonKo: row.message_ko,
          financialImpact: 0,
          blockingRequired: Boolean(row.blocking_required),
          payload: row
        }, createdAt);
      }
    });

    db.project.prepare("SELECT * FROM live_margin_events WHERE decision IN ('RED_ALERT', 'MARGIN_COST_INCREASE') OR current_margin_rate < 0.25").all().forEach((row) => {
      const rate = Number(row.current_margin_rate || 0);
      const riskLevel = rate < 0.2 || row.decision === 'RED_ALERT' ? 'RED' : 'ORANGE';
      upsertCeoDecisionItem({
        decisionId: `CEO-LIVE-${row.id}`,
        sourceModule: 'LiveMargin',
        entityType: 'LiveMarginEvent',
        entityId: row.id,
        decisionType: row.decision,
        titleKo: rate < 0.2 ? '실시간 마진 20% 미만' : '실시간 마진 위험',
        projectId: row.project_id,
        financialImpact: 0,
        riskLevel,
        requiredActionKo: '원가 누수 확인',
        deadline: row.created_at?.slice(0, 10),
        payload: row
      }, createdAt);
      if (riskLevel === 'RED') {
        upsertRedAlertEvent({
          redAlertId: `RED-LIVE-${row.id}`,
          sourceModule: 'LiveMargin',
          entityId: row.id,
          projectId: row.project_id,
          titleKo: 'Live Margin RED ALERT',
          reasonKo: row.reason,
          financialImpact: 0,
          blockingRequired: true,
          payload: row
        }, createdAt);
      }
    });

    db.project.prepare("SELECT * FROM change_orders WHERE status IN ('PENDING_APPROVAL', 'BLOCKED')").all().forEach((row) => {
      const riskLevel = row.status === 'BLOCKED' || row.pce_decision === 'BLOCK' ? 'RED' : 'ORANGE';
      upsertCeoDecisionItem({
        decisionId: `CEO-CHO-${row.change_order_id}`,
        sourceModule: 'ChangeOrder',
        entityType: 'ChangeOrder',
        entityId: row.change_order_id,
        decisionType: row.pce_decision,
        titleKo: row.status === 'BLOCKED' ? '저마진 추가공사 차단' : '추가공사 승인 대기',
        projectId: row.project_id,
        siteNameKo: row.site_name_ko,
        financialImpact: row.additional_amount,
        riskLevel,
        requiredActionKo: row.status === 'BLOCKED' ? '금액 재협상' : '승인/반려',
        deadline: row.request_date,
        payload: row
      }, createdAt);
      upsertApprovalRequest({
        requestId: `APR-CHO-${row.change_order_id}`,
        sourceModule: 'ChangeOrder',
        entityId: row.change_order_id,
        projectId: row.project_id,
        titleKo: row.change_content_ko,
        amount: row.additional_amount,
        reasonKo: row.change_reason_ko,
        status: row.status === 'BLOCKED' ? 'REJECTED' : 'PENDING'
      }, createdAt);
    });

    db.project.prepare("SELECT * FROM defect_reports WHERE status IN ('OPEN', 'IN_PROGRESS')").all().forEach((row) => {
      const riskLevel = Number(row.estimated_cost || 0) >= 100000 || ['HIGH', 'CRITICAL'].includes(row.severity) ? 'RED' : 'YELLOW';
      upsertCeoDecisionItem({
        decisionId: `CEO-DEF-${row.defect_id}`,
        sourceModule: 'Defect',
        entityType: 'DefectReport',
        entityId: row.defect_id,
        decisionType: 'DEFECT_COST',
        titleKo: '하자/AS 비용 발생',
        projectId: row.project_id,
        siteNameKo: row.site_name_ko,
        financialImpact: row.estimated_cost,
        riskLevel,
        requiredActionKo: '하자 처리비 승인/원인 분석',
        deadline: row.received_at,
        payload: row
      }, createdAt);
      if (riskLevel === 'RED') {
        upsertRedAlertEvent({
          redAlertId: `RED-DEF-${row.defect_id}`,
          sourceModule: 'Defect',
          entityId: row.defect_id,
          projectId: row.project_id,
          titleKo: '하자비용 RED ALERT',
          reasonKo: `${row.defect_type_ko}: ${row.root_cause_ko}`,
          financialImpact: row.estimated_cost,
          blockingRequired: false,
          payload: row
        }, createdAt);
      }
    });

    syncPaymentSchedules(createdAt);
    updatePaymentOverdues(createdAt);
    syncCashflowSnapshot(createdAt);
    syncClosingAlerts(createdAt);
  }

  function syncCashflowSnapshot(createdAt = nowIso()) {
    const today = createdAt.slice(0, 10);
    const sevenDaysLater = new Date(new Date(today).getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const receivables = db.project.prepare('SELECT * FROM receivables WHERE receivable_status NOT IN (\'PAID\', \'RECEIVED\', \'COMPLETED\')').all();
    const payables = db.project.prepare('SELECT * FROM payables WHERE payable_status NOT IN (\'PAID\', \'COMPLETED\')').all();
    const customerPayments = db.project.prepare('SELECT * FROM customer_payments').all();
    const vendorPayments = db.project.prepare('SELECT * FROM vendor_payments').all();
    const sum = (rows, predicate) => rows.filter(predicate).reduce((total, row) => total + Number(row.amount || 0), 0);
    const sumField = (rows, field, predicate) => rows.filter(predicate).reduce((total, row) => total + Number(row[field] || 0), 0);
    const todayExpectedInflow = sum(receivables, (row) => row.due_date === today);
    const todayExpectedOutflow = sum(payables, (row) => row.due_date === today);
    const sevenDayExpectedInflow = sum(receivables, (row) => row.due_date >= today && row.due_date <= sevenDaysLater);
    const sevenDayExpectedOutflow = sum(payables, (row) => row.due_date >= today && row.due_date <= sevenDaysLater);
    const todayActualInflow = sumField(customerPayments, 'actual_received_amount', (row) => row.actual_received_date === today);
    const todayActualOutflow = sumField(vendorPayments, 'actual_paid_amount', (row) => row.actual_paid_date === today);
    const sevenDayActualInflow = sumField(customerPayments, 'actual_received_amount', (row) => row.actual_received_date >= today && row.actual_received_date <= sevenDaysLater);
    const sevenDayActualOutflow = sumField(vendorPayments, 'actual_paid_amount', (row) => row.actual_paid_date >= today && row.actual_paid_date <= sevenDaysLater);
    const receivableAmount = sum(receivables, () => true);
    const payableAmount = sum(payables, () => true);
    const dataStatus = receivables.length || payables.length ? 'READY' : 'EMPTY';
    const snapshotId = `CASH-${today}`;
    const todayNetCashflow = todayExpectedInflow - todayExpectedOutflow;
    db.project.prepare(`
      INSERT OR REPLACE INTO cashflow_snapshots (
        snapshot_id, snapshot_date, today_expected_inflow, today_expected_outflow,
        today_net_cashflow, seven_day_expected_inflow, seven_day_expected_outflow,
        seven_day_net_cashflow, receivable_amount, payable_amount, data_status, created_at,
        today_actual_inflow, today_actual_outflow, seven_day_actual_inflow, seven_day_actual_outflow
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshotId,
      today,
      todayExpectedInflow,
      todayExpectedOutflow,
      todayNetCashflow,
      sevenDayExpectedInflow,
      sevenDayExpectedOutflow,
      sevenDayExpectedInflow - sevenDayExpectedOutflow,
      receivableAmount,
      payableAmount,
      dataStatus,
      createdAt,
      todayActualInflow,
      todayActualOutflow,
      sevenDayActualInflow,
      sevenDayActualOutflow
    );
    if (todayNetCashflow < 0) {
      upsertRedAlertEvent({
        redAlertId: `RED-CASH-${today}`,
        sourceModule: 'Cashflow',
        entityId: snapshotId,
        projectId: 'COMPANY',
        titleKo: '오늘 순현금흐름 음수',
        reasonKo: `오늘 순현금흐름 ${todayNetCashflow.toLocaleString('ko-KR')}원`,
        financialImpact: Math.abs(todayNetCashflow),
        blockingRequired: false,
        payload: { snapshotId, todayExpectedInflow, todayExpectedOutflow }
      }, createdAt);
      upsertCeoDecisionItem({
        decisionId: `CEO-CASH-${today}`,
        sourceModule: 'Cashflow',
        entityType: 'CashflowSnapshot',
        entityId: snapshotId,
        decisionType: 'NEGATIVE_CASHFLOW',
        titleKo: '오늘 현금흐름 음수',
        projectId: 'COMPANY',
        siteNameKo: '회사 전체',
        financialImpact: Math.abs(todayNetCashflow),
        riskLevel: 'RED',
        requiredActionKo: '입금/지급 일정 조정',
        deadline: today,
        payload: { snapshotId, todayExpectedInflow, todayExpectedOutflow, todayNetCashflow }
      }, createdAt);
    }
    return db.project.prepare('SELECT * FROM cashflow_snapshots WHERE snapshot_id = ?').get(snapshotId);
  }

  function getCeoControlTowerData() {
    const createdAt = nowIso();
    syncCeoControlTower(createdAt);
    const decisions = db.project.prepare(`
      SELECT *
      FROM ceo_decision_queue
      WHERE status IN ('PENDING', 'ACTIVE')
      ORDER BY
        CASE risk_level WHEN 'RED' THEN 0 WHEN 'ORANGE' THEN 1 WHEN 'YELLOW' THEN 2 ELSE 3 END,
        deadline ASC,
        updated_at DESC
    `).all().map((row) => ({
      decisionId: row.decision_id,
      sourceModule: row.source_module,
      entityType: row.entity_type,
      entityId: row.entity_id,
      type: row.decision_type,
      titleKo: row.title_ko,
      projectId: row.project_id,
      siteNameKo: row.site_name_ko,
      financialImpact: row.financial_impact,
      riskLevel: row.risk_level,
      requiredActionKo: row.required_action_ko,
      deadline: row.deadline,
      status: row.status,
      payload: fromJson(row.payload_json, {})
    }));
    const redAlerts = db.project.prepare(`
      SELECT *
      FROM red_alert_events
      WHERE status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 30
    `).all().map((row) => ({
      redAlertId: row.red_alert_id,
      sourceModule: row.source_module,
      entityId: row.entity_id,
      projectId: row.project_id,
      titleKo: row.title_ko,
      reasonKo: row.reason_ko,
      severity: row.severity,
      financialImpact: row.financial_impact,
      blockingRequired: Boolean(row.blocking_required),
      createdAt: row.created_at
    }));
    const approvalRequests = db.project.prepare(`
      SELECT *
      FROM approval_requests
      ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 50
    `).all().map((row) => ({
      requestId: row.request_id,
      sourceModule: row.source_module,
      entityId: row.entity_id,
      projectId: row.project_id,
      titleKo: row.title_ko,
      amount: row.amount,
      reasonKo: row.reason_ko,
      status: row.status,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by
    }));
    const cashflow = db.project.prepare('SELECT * FROM cashflow_snapshots ORDER BY created_at DESC LIMIT 1').get() || syncCashflowSnapshot(createdAt);
    return {
      snapshotDate: createdAt.slice(0, 10),
      summary: {
        decisionCount: decisions.length,
        redAlertCount: redAlerts.length,
        pendingApprovalCount: approvalRequests.filter((item) => item.status === 'PENDING').length,
        marginRiskCount: decisions.filter((item) => item.sourceModule === 'LiveMargin' || item.sourceModule === 'PCE').length,
        materialDelayCount: decisions.filter((item) => item.sourceModule === 'Procurement').length,
        inspectionFailCount: decisions.filter((item) => /INSPECTION|검수/.test(item.type + item.titleKo)).length,
        changeOrderCount: decisions.filter((item) => item.sourceModule === 'ChangeOrder').length,
        defectCost: decisions.filter((item) => item.sourceModule === 'Defect').reduce((sum, item) => sum + Number(item.financialImpact || 0), 0)
      },
      cashflow: {
        todayExpectedInflow: cashflow?.today_expected_inflow || 0,
        todayExpectedOutflow: cashflow?.today_expected_outflow || 0,
        todayActualInflow: cashflow?.today_actual_inflow || 0,
        todayActualOutflow: cashflow?.today_actual_outflow || 0,
        todayNetCashflow: cashflow?.today_net_cashflow || 0,
        sevenDayExpectedInflow: cashflow?.seven_day_expected_inflow || 0,
        sevenDayExpectedOutflow: cashflow?.seven_day_expected_outflow || 0,
        sevenDayActualInflow: cashflow?.seven_day_actual_inflow || 0,
        sevenDayActualOutflow: cashflow?.seven_day_actual_outflow || 0,
        sevenDayNetCashflow: cashflow?.seven_day_net_cashflow || 0,
        receivableAmount: cashflow?.receivable_amount || 0,
        payableAmount: cashflow?.payable_amount || 0,
        dataStatus: cashflow?.data_status || 'EMPTY',
        displayStatusKo: cashflow?.data_status === 'READY' ? '데이터 있음' : '데이터 없음'
      },
      decisions,
      redAlerts,
      approvalRequests
    };
  }

  function decideCeoApprovalRequest({ requestId, decision, actor = 'CEO', reasonKo = '' }) {
    if (!['APPROVED', 'REJECTED'].includes(decision)) throw new Error('decision must be APPROVED or REJECTED');
    const createdAt = nowIso();
    const request = db.project.prepare('SELECT * FROM approval_requests WHERE request_id = ?').get(requestId);
    if (!request) throw new Error(`CEO approval request not found: ${requestId}`);
    db.project.prepare(`
      UPDATE approval_requests
      SET status = ?,
          approved_at = CASE WHEN ? = 'APPROVED' THEN ? ELSE approved_at END,
          approved_by = CASE WHEN ? = 'APPROVED' THEN ? ELSE approved_by END,
          rejected_at = CASE WHEN ? = 'REJECTED' THEN ? ELSE rejected_at END,
          rejected_by = CASE WHEN ? = 'REJECTED' THEN ? ELSE rejected_by END,
          decision_reason_ko = ?
      WHERE request_id = ?
    `).run(
      decision,
      decision,
      createdAt,
      decision,
      actor,
      decision,
      createdAt,
      decision,
      actor,
      reasonKo || (decision === 'APPROVED' ? '대표 승인' : '대표 반려'),
      requestId
    );
    db.project.prepare(`
      UPDATE ceo_decision_queue
      SET status = ?, updated_at = ?
      WHERE entity_id = ? OR decision_id = ?
    `).run(decision, createdAt, request.entity_id, `CEO-${request.source_module}-${request.entity_id}`);
    if (request.source_module === 'PAYMENT') {
      db.project.prepare(`
        UPDATE vendor_payments
        SET approval_status = ?, updated_at = ?
        WHERE payment_id = ?
      `).run(decision === 'APPROVED' ? 'APPROVED' : 'REJECTED', createdAt, request.entity_id);
    }
    writeOperationalLog({
      actionType: `CEO_CONTROL_TOWER_${decision}`,
      actor,
      projectId: request.project_id,
      messageKo: `${request.title_ko}: ${decision === 'APPROVED' ? '승인' : '반려'}`,
      actionKo: decision === 'APPROVED' ? '승인' : '반려',
      level: decision === 'REJECTED' ? 'WARNING' : 'INFO',
      payload: { requestId, sourceModule: request.source_module, entityId: request.entity_id },
      reasonKo: reasonKo || '',
      createdAt
    });
    return { dashboardData: getDashboardData(), controlTowerData: getCeoControlTowerData(), requestId, decision };
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

  function ensureExecutionContextForRecord(projectId) {
    const createdAt = nowIso();
    let executionProject = db.project.prepare('SELECT * FROM execution_projects WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    if (!executionProject) {
      const executionProjectId = `EXEC-AUTO-${projectId}`;
      db.project.prepare(`
        INSERT OR REPLACE INTO execution_projects (
          execution_project_id, project_id, final_estimate_id, execution_status,
          preliminary_execution_warning, warning_reasons_json, created_from_approval_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM execution_projects WHERE execution_project_id = ?), ?), ?)
      `).run(
        executionProjectId,
        projectId,
        `FINAL-AUTO-${projectId}`,
        'EXECUTION_READY',
        1,
        toJson(['자동 실행 기록 생성을 위해 생성된 execution context']),
        'APP-AUTO-EXECUTION',
        executionProjectId,
        createdAt,
        createdAt
      );
      executionProject = db.project.prepare('SELECT * FROM execution_projects WHERE execution_project_id = ?').get(executionProjectId);
    }

    let siteOperation = db.project.prepare('SELECT * FROM site_operations WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1').get(projectId);
    if (!siteOperation) {
      const siteOperationId = `SITE-${executionProject.execution_project_id}`;
      db.project.prepare(`
        INSERT OR REPLACE INTO site_operations (
          site_operation_id, execution_project_id, project_id, site_status,
          overall_progress_rate, blocked_processes_json, risk_flags_json,
          started_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT started_at FROM site_operations WHERE site_operation_id = ?), ?), ?)
      `).run(
        siteOperationId,
        executionProject.execution_project_id,
        projectId,
        'IN_PROGRESS',
        1,
        toJson([]),
        toJson(['현장 실행 기록 활성화']),
        siteOperationId,
        createdAt,
        createdAt
      );
      siteOperation = db.project.prepare('SELECT * FROM site_operations WHERE site_operation_id = ?').get(siteOperationId);
    }

    return { executionProject, siteOperation };
  }

  function getScheduleItemsForProject(projectId, scheduleId = null) {
    const schedule = scheduleId
      ? db.project.prepare('SELECT * FROM construction_schedules WHERE id = ?').get(scheduleId)
      : db.project.prepare('SELECT * FROM construction_schedules WHERE estimate_id = ? ORDER BY created_at DESC LIMIT 1').get(projectId);
    if (!schedule) return { schedule: null, items: [] };
    const items = db.project.prepare('SELECT * FROM construction_schedule_items WHERE schedule_id = ? ORDER BY sort_order ASC').all(schedule.id);
    return { schedule, items };
  }

  function createDailySiteReportFromSchedule({
    projectId,
    scheduleId = null,
    reportDate = new Date().toISOString().slice(0, 10),
    weatherKo = '맑음',
    issueSummaryKo = '특이사항 없음',
    managerKo = '현장관리자',
    actor = 'CEO'
  }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_DAILY_SITE_REPORT_FROM_SCHEDULE', payload: { projectId, scheduleId } });
    const { siteOperation } = ensureExecutionContextForRecord(projectId);
    const { items } = getScheduleItemsForProject(projectId, scheduleId);
    const report = buildDailySiteReport({ projectId, scheduleItems: items, reportDate, weatherKo, managerKo, issueSummaryKo });
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
      report.reportDate,
      toJson([{ processNameKo: report.todayProcessKo, progressStatus: 'IN_PROGRESS' }]),
      toJson({ status: 'NEEDS_ATTENDANCE_REPORT', noteKo: '출역일보와 연결 필요' }),
      toJson({ status: 'NEEDS_MATERIAL_USAGE', noteKo: '사용 자재 기록 필요' }),
      report.issueSummaryKo,
      report.photoStatus,
      reportId,
      createdAt,
      createdAt
    );

    db.project.prepare(`
      INSERT OR REPLACE INTO daily_site_report_items (
        item_id, report_id, project_id, process_name_ko, work_content_ko,
        crew_summary_json, material_summary_json, delay_reason_ko, tomorrow_process_ko,
        manager_ko, approval_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `DSRI-${reportId}`,
      reportId,
      projectId,
      report.todayProcessKo,
      report.workDescriptionKo,
      toJson([]),
      toJson([]),
      report.delayReasonKo,
      report.tomorrowProcessKo,
      report.managerKo,
      report.approvalStatus,
      createdAt
    );

    writeOperationalLog({
      actionType: 'CREATE_DAILY_SITE_REPORT_FROM_SCHEDULE',
      actor,
      projectId,
      messageKo: `공사일보 생성: ${report.todayProcessKo}`,
      actionKo: '공사일보',
      level: 'INFO',
      payload: { reportId, scheduleId, report },
      reasonKo: '공정표 기준 금일 공정 자동 반영',
      createdAt
    });

    return { dashboardData: getDashboardData(), reportId, report };
  }

  function createCrewAttendanceReport({ projectId, siteNameKo = '현장', workDate, workers = [], actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_CREW_ATTENDANCE_REPORT', payload: { projectId } });
    ensureExecutionContextForRecord(projectId);
    const createdAt = nowIso();
    const rows = buildAttendanceRows({ projectId, siteNameKo, workDate, workers });
    const insert = db.project.prepare(`
      INSERT INTO crew_attendance_logs (
        attendance_log_id, project_id, site_name_ko, work_date, worker_name_ko,
        role_ko, affiliation_ko, check_in_time, check_out_time, work_hours,
        daily_wage, labor_cost, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    rows.forEach((row, index) => {
      insert.run(
        `ATTLOG-${Date.now()}-${index}`,
        projectId,
        row.siteNameKo,
        row.workDate,
        row.workerNameKo,
        row.roleKo,
        row.affiliationKo,
        row.checkInTime,
        row.checkOutTime,
        row.workHours,
        row.dailyWage,
        row.laborCost,
        row.notesKo,
        createdAt
      );
    });
    const totalLaborCost = rows.reduce((sum, row) => sum + Number(row.laborCost || 0), 0);
    db.project.prepare(`
      INSERT INTO labor_cost_records (
        labor_cost_record_id, crew_allocation_id, crew_member_id, project_id,
        cost_capture_entry_id, planned_labor_cost, actual_labor_cost,
        variance_amount, variance_rate, cost_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LABOR-ACTUAL-${projectId}-${Date.now()}`,
      'ATTENDANCE_LOG',
      'MULTI_CREW',
      projectId,
      null,
      0,
      totalLaborCost,
      totalLaborCost,
      0,
      totalLaborCost > 0 ? 'ACTUAL_RECORDED' : 'NO_COST',
      createdAt,
      createdAt
    );
    writeOperationalLog({
      actionType: 'CREATE_CREW_ATTENDANCE_REPORT',
      actor,
      projectId,
      messageKo: `출역일보 저장: ${rows.length}명 / 노무비 ${totalLaborCost.toLocaleString('ko-KR')}원`,
      actionKo: '출역일보',
      level: 'INFO',
      payload: { attendanceCount: rows.length, totalLaborCost },
      reasonKo: '출역 기록과 실제 노무비 연결',
      createdAt
    });
    return { dashboardData: getDashboardData(), attendanceCount: rows.length, totalLaborCost, rows };
  }

  function createMaterialReceivingLog({ projectId, purchaseOrderId, receivedItems = [], actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_MATERIAL_RECEIVING_LOG', payload: { projectId, purchaseOrderId } });
    ensureExecutionContextForRecord(projectId);
    const createdAt = nowIso();
    const purchaseOrder = db.project.prepare('SELECT * FROM purchase_orders WHERE purchase_order_id = ?').get(purchaseOrderId);
    const rows = buildReceivingRows({ purchaseOrder, items: receivedItems });
    const insert = db.project.prepare(`
      INSERT INTO material_receiving_logs (
        receiving_log_id, project_id, purchase_order_id, item_name_ko, specification_ko,
        ordered_quantity, received_quantity, missing_quantity, unit, received_at,
        supplier_name_ko, inspection_status, damage_or_missing, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    rows.forEach((row, index) => {
      insert.run(
        `MRL-${Date.now()}-${index}`,
        projectId,
        row.purchaseOrderId,
        row.itemNameKo,
        row.specificationKo,
        row.orderedQuantity,
        row.receivedQuantity,
        row.missingQuantity,
        row.unit,
        row.receivedAt,
        row.supplierNameKo,
        row.inspectionStatus,
        row.damageOrMissing ? 1 : 0,
        row.notesKo,
        createdAt
      );
    });
    const shortages = rows.filter((row) => row.missingQuantity > 0);
    if (shortages.length > 0) {
      upsertEventTrigger({
        triggerKey: `MATERIAL-SHORTAGE-${purchaseOrderId}-${Date.now()}`,
        eventType: 'MATERIAL_RECEIVING_SHORTAGE',
        eventCategory: 'Procurement',
        severity: 'RED',
        projectId,
        titleKo: '자재 입고 수량 부족',
        messageKo: `입고 부족 ${shortages.length}건: 발주 수량 대비 미입고가 발생했습니다.`,
        nextActionKo: '거래처/재발주 확인',
        blockingRequired: false,
        payload: { purchaseOrderId, shortages }
      });
    }
    writeOperationalLog({
      actionType: 'CREATE_MATERIAL_RECEIVING_LOG',
      actor,
      projectId,
      messageKo: shortages.length ? `자재입고 부족 감지: ${shortages.length}건` : '자재입고 확인 완료',
      actionKo: '자재입고',
      level: shortages.length ? 'RED' : 'INFO',
      payload: { purchaseOrderId, rows },
      reasonKo: '발주 수량과 입고 수량 비교',
      createdAt
    });
    if (shortages.length > 0) {
      createCommunicationDraft({
        messageType: 'VENDOR_SHORTAGE_NOTICE',
        relatedEntityType: 'MaterialReceiving',
        relatedEntityId: purchaseOrderId,
        targetType: 'VENDOR',
        targetName: shortages[0].supplierNameKo,
        status: 'READY',
        createdAt
      });
    }
    return { dashboardData: getDashboardData(), receivingCount: rows.length, shortageCount: shortages.length, shortages };
  }

  function createInspectionChecklistFromSchedule({ projectId, scheduleId = null, processNameKo = '욕실 공정', actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_INSPECTION_CHECKLIST', payload: { projectId, scheduleId } });
    const { executionProject } = ensureExecutionContextForRecord(projectId);
    const createdAt = nowIso();
    const checklist = buildBathroomInspectionChecklist(processNameKo);
    const checklistId = `ICL-${projectId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO inspection_checklists (
        checklist_id, execution_project_id, project_id, checklist_type,
        display_name_ko, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      checklistId,
      executionProject.execution_project_id,
      projectId,
      'BATHROOM_REQUIRED_INSPECTION',
      checklist.checklistNameKo,
      toJson({ scheduleId, processNameKo, items: checklist.items }),
      createdAt
    );
    const insert = db.project.prepare(`
      INSERT INTO inspection_checklist_items (
        item_id, checklist_id, project_id, process_name_ko, check_item_ko,
        criterion_ko, result_status, critical_flag, photo_status, action_required_ko,
        inspector_ko, inspected_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    checklist.items.forEach((item) => {
      insert.run(
        `ICLI-${checklistId}-${String(item.sortOrder).padStart(2, '0')}`,
        checklistId,
        projectId,
        item.processNameKo,
        item.itemNameKo,
        item.criterionKo,
        'PENDING',
        item.critical ? 1 : 0,
        'PHOTO_PLACEHOLDER',
        '',
        actor,
        createdAt,
        createdAt
      );
    });
    writeOperationalLog({
      actionType: 'CREATE_INSPECTION_CHECKLIST',
      actor,
      projectId,
      messageKo: `검수 체크리스트 생성: ${checklist.checklistNameKo}`,
      actionKo: '검수표',
      level: 'INFO',
      payload: { checklistId, itemCount: checklist.items.length },
      reasonKo: '공정표 기준 욕실 필수 검수 항목 생성',
      createdAt
    });
    return { dashboardData: getDashboardData(), checklistId, checklist };
  }

  function saveInspectionChecklistResults({ projectId, checklistId, results = [], actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'SAVE_INSPECTION_CHECKLIST_RESULTS', payload: { projectId, checklistId } });
    const { siteOperation } = ensureExecutionContextForRecord(projectId);
    const createdAt = nowIso();
    const existingItems = db.project.prepare('SELECT * FROM inspection_checklist_items WHERE checklist_id = ? ORDER BY item_id').all(checklistId);
    const resultMap = new Map(results.map((result) => [result.itemId || result.checkItemKo, result]));
    const evaluatedItems = existingItems.map((item) => {
      const result = resultMap.get(item.item_id) || resultMap.get(item.check_item_ko) || {};
      return {
        itemId: item.item_id,
        itemNameKo: item.check_item_ko,
        critical: Boolean(item.critical_flag),
        result: result.resultStatus || result.result || 'PASS',
        actionRequiredKo: result.actionRequiredKo || ''
      };
    });
    const evaluation = evaluateInspectionItems(evaluatedItems);
    const update = db.project.prepare(`
      UPDATE inspection_checklist_items
      SET result_status = ?, action_required_ko = ?, inspector_ko = ?, inspected_at = ?
      WHERE item_id = ?
    `);
    evaluatedItems.forEach((item) => {
      update.run(item.result, item.actionRequiredKo, actor, createdAt, item.itemId);
    });

    const inspectionResultStatus = evaluation.hasFail ? 'FAILED' : 'PASSED';
    const inspectionResultId = `INSP-CHK-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO inspection_results (
        inspection_result_id, site_operation_id, project_id, inspection_type,
        related_process_id, result_status, blocked_processes_json, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inspectionResultId,
      siteOperation.site_operation_id,
      projectId,
      'CHECKLIST',
      checklistId,
      inspectionResultStatus,
      toJson(evaluation.blockedProcessesKo),
      evaluation.hasFail ? `${evaluation.failedItems.map((item) => item.itemNameKo).join(', ')} FAIL` : '전체 PASS',
      createdAt
    );

    if (evaluation.hasCriticalFail) {
      const currentBlocked = fromJson(siteOperation.blocked_processes_json, []);
      const mergedBlocked = Array.from(new Set([...currentBlocked, ...evaluation.blockedProcessesKo, '다음 의존 공정']));
      db.project.prepare('UPDATE site_operations SET blocked_processes_json = ?, risk_flags_json = ?, updated_at = ? WHERE site_operation_id = ?')
        .run(toJson(mergedBlocked), toJson(['Critical 검수 FAIL', '후속 공정 차단']), createdAt, siteOperation.site_operation_id);
      upsertEventTrigger({
        triggerKey: `INSPECTION-CRITICAL-FAIL-${checklistId}`,
        eventType: 'INSPECTION_CRITICAL_FAIL',
        eventCategory: 'Site',
        severity: 'RED',
        projectId,
        titleKo: '검수 Critical FAIL',
        messageKo: '중요 검수 항목 FAIL: 후속 의존 공정을 차단합니다.',
        nextActionKo: '재시공/보완 조치',
        blockingRequired: true,
        payload: { checklistId, criticalFailedItems: evaluation.criticalFailedItems }
      });
    }

    writeOperationalLog({
      actionType: 'SAVE_INSPECTION_CHECKLIST_RESULTS',
      actor,
      projectId,
      messageKo: evaluation.hasFail ? '검수 FAIL 발생' : '검수 PASS: 후속 공정 가능',
      actionKo: '검수',
      level: evaluation.hasCriticalFail ? 'RED' : evaluation.hasFail ? 'WARNING' : 'INFO',
      payload: { checklistId, inspectionResultId, evaluation },
      reasonKo: '검수 체크리스트 결과 저장',
      createdAt
    });
    createCommunicationDraft({
      messageType: 'CLIENT_INSPECTION_RESULT',
      relatedEntityType: 'Inspection',
      relatedEntityId: inspectionResultId,
      targetType: 'CLIENT',
      status: evaluation.hasFail ? 'READY' : 'DRAFT',
      createdAt
    });
    return { dashboardData: getDashboardData(), checklistId, inspectionResultId, evaluation };
  }

  function createExecutionChangeOrder({ projectId, siteNameKo = '현장', requestedByKo = '고객', titleKo, changeContentKo, changeReasonKo, additionalAmount, additionalCost, scheduleImpactDays = 0, customerApprovalStatus = 'PENDING', actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_EXECUTION_CHANGE_ORDER', payload: { projectId } });
    ensureExecutionContextForRecord(projectId);
    const createdAt = nowIso();
    const payload = buildChangeOrderPayload({
      titleKo,
      reasonKo: changeReasonKo,
      additionalAmount,
      additionalCost,
      scheduleImpactDays,
      customerApprovalStatus
    });
    const pce = runProfitControlEngine({
      estimateId: `CO-${projectId}-${Date.now()}`,
      revenue: payload.additionalAmount,
      totalCost: payload.additionalCost,
      scheduleRisk: payload.scheduleImpactDays * 50000,
      createdAt
    });
    const changeOrderId = `CHO-${projectId}-${Date.now()}`;
    const blocked = pce.decision === 'BLOCK';
    db.project.prepare(`
      INSERT INTO change_orders (
        change_order_id, project_id, site_name_ko, request_date, requested_by_ko,
        change_content_ko, change_reason_ko, additional_amount, additional_cost,
        additional_margin, additional_margin_rate, schedule_impact_days,
        customer_approval_status, internal_approval_status, pce_decision, pce_id,
        signature_status, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      changeOrderId,
      projectId,
      siteNameKo,
      createdAt.slice(0, 10),
      requestedByKo,
      changeContentKo || payload.titleKo,
      payload.reasonKo,
      payload.additionalAmount,
      payload.additionalCost,
      payload.additionalMargin,
      payload.additionalMarginRate,
      payload.scheduleImpactDays,
      payload.customerApprovalStatus,
      blocked ? 'BLOCKED_BY_PCE' : 'PENDING_CEO_APPROVAL',
      pce.decision,
      pce.id,
      'SIGNATURE_PLACEHOLDER',
      blocked ? 'BLOCKED' : 'PENDING_APPROVAL',
      createdAt,
      createdAt
    );
    if (blocked) {
      upsertEventTrigger({
        triggerKey: `CHANGE-ORDER-PCE-BLOCK-${changeOrderId}`,
        eventType: 'CHANGE_ORDER_LOW_MARGIN_BLOCKED',
        eventCategory: 'Cost',
        severity: 'RED',
        projectId,
        titleKo: '저마진 추가공사 차단',
        messageKo: `추가공사 마진율 ${(pce.realMargin * 100).toFixed(1)}%: PCE BLOCK`,
        nextActionKo: '금액 재협상',
        blockingRequired: true,
        payload: { changeOrderId, pce }
      });
    }
    writeOperationalLog({
      actionType: 'CREATE_EXECUTION_CHANGE_ORDER',
      actor,
      projectId,
      messageKo: blocked ? '저마진 추가공사 차단' : '추가공사 승인 요청 생성',
      actionKo: '추가공사',
      level: blocked ? 'RED' : 'WARNING',
      payload: { changeOrderId, pce, payload },
      reasonKo: payload.reasonKo,
      createdAt
    });
    createCommunicationDraft({
      messageType: 'CLIENT_CHANGE_ORDER_APPROVAL',
      relatedEntityType: 'ChangeOrder',
      relatedEntityId: changeOrderId,
      targetType: 'CLIENT',
      status: blocked ? 'DRAFT' : 'READY',
      createdAt
    });
    return { dashboardData: getDashboardData(), changeOrderId, pce, blocked };
  }

  function approveExecutionChangeOrder({ changeOrderId, actor = 'CEO', reasonKo = '대표 승인' }) {
    const createdAt = nowIso();
    const changeOrder = db.project.prepare('SELECT * FROM change_orders WHERE change_order_id = ?').get(changeOrderId);
    if (!changeOrder) throw new Error(`Change order not found: ${changeOrderId}`);
    if (changeOrder.pce_decision === 'BLOCK') throw new Error('Low-margin change order blocked: PCE decision is BLOCK.');
    db.project.prepare(`
      UPDATE change_orders
      SET internal_approval_status = 'APPROVED', status = 'APPROVED', updated_at = ?
      WHERE change_order_id = ?
    `).run(createdAt, changeOrderId);
    db.project.prepare(`
      INSERT INTO live_margin_events (
        id, project_id, estimate_id, current_margin_rate, threshold, decision, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LME-CO-${changeOrderId}`,
      changeOrder.project_id,
      changeOrderId,
      Number(changeOrder.additional_margin_rate || 0),
      0.25,
      Number(changeOrder.additional_margin_rate || 0) < 0.25 ? 'RED_ALERT' : 'APPROVED_CHANGE_ORDER',
      '추가공사 승인 후 매출/마진 영향 기록',
      createdAt
    );
    db.project.prepare(`
      INSERT OR IGNORE INTO receivables (
        receivable_id, project_id, amount, due_date, actual_received_date,
        receivable_status, notes_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`REC-CO-${changeOrderId}`, changeOrder.project_id, Number(changeOrder.additional_amount || 0), createdAt.slice(0, 10), null, 'EXPECTED', '추가공사비 예정', createdAt, createdAt);
    if (Number(changeOrder.additional_cost || 0) > 0) {
      db.project.prepare(`
        INSERT OR IGNORE INTO payables (
          payable_id, project_id, vendor_id, amount, due_date, actual_paid_date,
          payable_status, payable_type, notes_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`PAY-CO-${changeOrderId}`, changeOrder.project_id, 'CHANGE_ORDER_COST', Number(changeOrder.additional_cost || 0), createdAt.slice(0, 10), null, 'EXPECTED', 'CHANGE_ORDER_COST', '추가공사 원가 예정', createdAt, createdAt);
    }
    syncCashflowSnapshot(createdAt);
    writeOperationalLog({
      actionType: 'APPROVE_EXECUTION_CHANGE_ORDER',
      actor,
      projectId: changeOrder.project_id,
      messageKo: `추가공사 승인: ${Number(changeOrder.additional_amount || 0).toLocaleString('ko-KR')}원`,
      actionKo: '추가공사 승인',
      level: 'INFO',
      payload: { changeOrderId, additionalAmount: changeOrder.additional_amount },
      reasonKo,
      createdAt
    });
    return { dashboardData: getDashboardData(), changeOrderId, status: 'APPROVED', revenueImpact: Number(changeOrder.additional_amount || 0) };
  }

  function createDefectReport({ projectId, siteNameKo = '현장', defectLocationKo, defectTypeKo, severity = 'MEDIUM', rootCauseKo, estimatedCost = 0, managerKo = '현장관리자', actor = 'CEO' }) {
    requirePermission({ actor, permissionKey: 'SITE_OPERATION_INPUT', actionType: 'CREATE_DEFECT_REPORT', payload: { projectId } });
    ensureExecutionContextForRecord(projectId);
    const createdAt = nowIso();
    const defect = buildDefectPayload({ siteNameKo, defectLocationKo, defectTypeKo, severity, rootCauseKo, estimatedCost, managerKo });
    const defectId = `DEF-${projectId}-${Date.now()}`;
    db.project.prepare(`
      INSERT INTO defect_reports (
        defect_id, project_id, site_name_ko, received_at, defect_location_ko,
        defect_type_ko, severity, root_cause_ko, manager_ko, estimated_cost,
        status, completed_at, customer_confirmed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      defectId,
      projectId,
      defect.siteNameKo,
      createdAt.slice(0, 10),
      defect.defectLocationKo,
      defect.defectTypeKo,
      defect.severity,
      defect.rootCauseKo,
      defect.managerKo,
      defect.estimatedCost,
      defect.status,
      null,
      defect.customerConfirmed ? 1 : 0,
      createdAt,
      createdAt
    );
    db.project.prepare(`
      INSERT INTO live_margin_events (
        id, project_id, estimate_id, current_margin_rate, threshold, decision, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LME-DEF-${defectId}`,
      projectId,
      defectId,
      0,
      0.25,
      defect.estimatedCost > 0 ? 'MARGIN_COST_INCREASE' : 'DEFECT_RECORDED',
      `하자 예상 처리비 ${defect.estimatedCost.toLocaleString('ko-KR')}원 반영`,
      createdAt
    );
    if (Number(defect.estimatedCost || 0) > 0) {
      db.project.prepare(`
        INSERT OR IGNORE INTO payables (
          payable_id, project_id, vendor_id, amount, due_date, actual_paid_date,
          payable_status, payable_type, notes_ko, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`PAY-DEF-${defectId}`, projectId, 'DEFECT_REWORK', Number(defect.estimatedCost || 0), createdAt.slice(0, 10), null, 'EXPECTED', 'DEFECT_COST', '하자/AS 예상 비용', createdAt, createdAt);
      syncCashflowSnapshot(createdAt);
    }
    const rootCauseId = `RCA-DEF-${defectId}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO cost_leak_root_causes (
        root_cause_id, leak_id, project_id, requirement_id, process_id,
        cost_category, item_name_ko, root_cause_type, root_cause_name_ko,
        reason_ko, status, approval_required, case_library_link_json,
        evidence_json, created_at, updated_at, estimate_id, financial_impact, recommended_prevention
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM cost_leak_root_causes WHERE root_cause_id = ?), ?), ?, ?, ?, ?)
    `).run(
      rootCauseId,
      defectId,
      projectId,
      defectId,
      'defect_management',
      'defect_rework',
      defect.defectTypeKo,
      'defect_rework',
      '시공 하자/재작업',
      defect.rootCauseKo,
      'CANDIDATE',
      1,
      toJson({ defectId, projectId }),
      toJson({ estimatedCost: defect.estimatedCost, severity: defect.severity }),
      rootCauseId,
      createdAt,
      createdAt,
      defectId,
      defect.estimatedCost,
      '다음 견적에 하자/재작업 리스크 버퍼 반영'
    );
    syncRootCausePatterns(createdAt);
    if (defect.redAlert) {
      upsertEventTrigger({
        triggerKey: `DEFECT-${defectId}`,
        eventType: 'DEFECT_RED_ALERT',
        eventCategory: 'Site',
        severity: 'RED',
        projectId,
        titleKo: '하자 RED ALERT',
        messageKo: `${defect.defectTypeKo} / ${defect.defectLocationKo}: ${defect.rootCauseKo}`,
        nextActionKo: '하자 처리',
        blockingRequired: false,
        payload: { defectId, estimatedCost: defect.estimatedCost }
      });
    }
    writeOperationalLog({
      actionType: 'CREATE_DEFECT_REPORT',
      actor,
      projectId,
      messageKo: `하자 접수: ${defect.defectTypeKo}`,
      actionKo: '하자관리',
      level: defect.redAlert ? 'RED' : 'WARNING',
      payload: { defectId, rootCauseId, defect },
      reasonKo: defect.rootCauseKo,
      createdAt
    });
    createCommunicationDraft({
      messageType: 'CLIENT_DEFECT_RECEIVED',
      relatedEntityType: 'Defect',
      relatedEntityId: defectId,
      targetType: 'CLIENT',
      status: 'READY',
      createdAt
    });
    return { dashboardData: getDashboardData(), defectId, rootCauseId, defect };
  }

  function getFieldMobileCenterData({ projectId = null, roleMode = '팀장' } = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const projects = db.project.prepare('SELECT * FROM projects ORDER BY project_id ASC LIMIT 20').all();
    const executionProjects = db.project.prepare('SELECT * FROM execution_projects ORDER BY updated_at DESC LIMIT 20').all();
    const siteOperations = db.project.prepare('SELECT * FROM site_operations ORDER BY updated_at DESC LIMIT 20').all();
    const activeProjectId = projectId || siteOperations[0]?.project_id || executionProjects[0]?.project_id || projects[0]?.project_id || 'FIELD-MOBILE-DEMO';
    const todayReports = db.project.prepare('SELECT * FROM daily_site_reports WHERE report_date = ? ORDER BY created_at DESC LIMIT 20').all(today);
    const todayAttendance = db.project.prepare('SELECT * FROM crew_attendance_logs WHERE work_date = ? ORDER BY created_at DESC LIMIT 30').all(today);
    const materialReceiving = db.project.prepare('SELECT * FROM material_receiving_logs ORDER BY created_at DESC LIMIT 20').all();
    const inspections = db.project.prepare('SELECT * FROM inspection_checklist_items ORDER BY created_at DESC LIMIT 30').all();
    const mediaFiles = db.project.prepare('SELECT * FROM site_media_files ORDER BY created_at DESC LIMIT 30').all();
    const signatures = db.project.prepare('SELECT * FROM field_signatures ORDER BY created_at DESC LIMIT 20').all();
    const riskReports = db.project.prepare("SELECT * FROM field_risk_reports ORDER BY CASE severity WHEN 'RED' THEN 0 WHEN 'ORANGE' THEN 1 WHEN 'YELLOW' THEN 2 ELSE 3 END, created_at DESC LIMIT 30").all();
    const todaySite = {
      projectId: activeProjectId,
      siteNameKo: projects.find((project) => project.project_id === activeProjectId)?.project_name_ko || activeProjectId,
      todayProcessKo: todayReports[0] ? fromJson(todayReports[0].process_progress_json, [])[0]?.processNameKo || '현장 확인' : '오늘 공정 미등록',
      plannedWorkKo: todayReports[0]?.issue_summary_ko || '오늘 배정된 현장이 없습니다.',
      teamKo: todayAttendance.length ? `${todayAttendance.length}명 출역` : '팀 미등록',
      startTime: todayAttendance[0]?.check_in_time || '미등록',
      expectedEndTime: todayAttendance[0]?.check_out_time || '미등록',
      checklistKo: inspections.length ? inspections.slice(0, 5).map((item) => item.check_item_ko) : [],
      riskAlerts: riskReports.filter((risk) => risk.project_id === activeProjectId && risk.severity !== 'NORMAL').slice(0, 5)
    };
    return {
      roleModes: ['현장 작업자', '팀장', '마스터', '관리자'],
      roleMode,
      todaySite,
      todayReports,
      todayAttendance,
      materialReceiving,
      inspections,
      mediaFiles,
      signatures,
      riskReports,
      summary: {
        attendanceCount: todayAttendance.length,
        dailyReportCount: todayReports.length,
        mediaCount: mediaFiles.length,
        shortageCount: materialReceiving.filter((row) => Number(row.missing_quantity || 0) > 0 || Number(row.damage_or_missing || 0) > 0).length,
        failInspectionCount: inspections.filter((row) => row.result_status === 'FAIL').length,
        redRiskCount: riskReports.filter((row) => row.severity === 'RED').length,
        displayStatusKo: projects.length || executionProjects.length ? '현장 데이터 있음' : '오늘 배정된 현장이 없습니다.'
      },
      emptyState: projects.length === 0 && executionProjects.length === 0 && siteOperations.length === 0
    };
  }

  function saveSiteMediaFile(payload = {}) {
    const createdAt = payload.createdAt || nowIso();
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    const id = payload.id || `MEDIA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO site_media_files (
        id, project_id, report_id, related_entity_type, related_entity_id,
        file_name, file_path, media_type, caption, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM site_media_files WHERE id = ?), ?))
    `).run(id, projectId, payload.reportId || payload.report_id || null, payload.relatedEntityType || payload.related_entity_type || 'FIELD', payload.relatedEntityId || payload.related_entity_id || 'FIELD-MOBILE', payload.fileName || payload.file_name || '현장사진.jpg', payload.filePath || payload.file_path || '', payload.mediaType || payload.media_type || 'PHOTO', payload.caption || '', payload.uploadedBy || payload.uploaded_by || payload.actor || 'FIELD', id, createdAt);
    writeOperationalLog({ actionType: 'FIELD_MEDIA_UPLOAD', actor: payload.uploadedBy || payload.actor || 'FIELD', projectId, messageKo: `현장 미디어 저장: ${payload.fileName || payload.file_name || '현장사진.jpg'}`, actionKo: '사진 업로드', level: 'INFO', payload: { mediaId: id }, reasonKo: payload.caption || '현장 모바일 업로드', createdAt });
    return { mediaId: id, media: db.project.prepare('SELECT * FROM site_media_files WHERE id = ?').get(id), fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function saveFieldAttendanceCheckIn(payload = {}) {
    const createdAt = payload.createdAt || nowIso();
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    ensureExecutionContextForRecord(projectId);
    const workDate = payload.workDate || payload.work_date || createdAt.slice(0, 10);
    const attendanceId = payload.attendanceId || `FATT-${projectId}-${Date.now()}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO crew_attendance_logs (
        attendance_log_id, project_id, site_name_ko, work_date, worker_name_ko,
        role_ko, affiliation_ko, check_in_time, check_out_time, work_hours,
        daily_wage, labor_cost, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM crew_attendance_logs WHERE attendance_log_id = ?), ?))
    `).run(attendanceId, projectId, payload.siteNameKo || payload.site_name_ko || '현장', workDate, payload.workerNameKo || payload.worker_name_ko || '작업자', payload.roleKo || payload.role_ko || '작업자', payload.affiliationKo || payload.affiliation_ko || '현장팀', payload.checkInTime || payload.check_in_time || new Date().toTimeString().slice(0, 5), payload.checkOutTime || payload.check_out_time || '', 0, Math.round(Number(payload.dailyWage || payload.daily_wage || 0)), 0, payload.notesKo || payload.notes_ko || '모바일 출근 체크', attendanceId, createdAt);
    writeOperationalLog({ actionType: 'FIELD_ATTENDANCE_CHECK_IN', actor: payload.workerNameKo || payload.worker_name_ko || 'FIELD', projectId, messageKo: '모바일 출근 체크가 저장되었습니다.', actionKo: '출근 체크', level: 'INFO', payload: { attendanceId }, reasonKo: '현장 모바일 출역', createdAt });
    return { attendanceId, attendance: db.project.prepare('SELECT * FROM crew_attendance_logs WHERE attendance_log_id = ?').get(attendanceId), fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function timeDiffHours(start, end) {
    const [sh, sm] = String(start || '00:00').split(':').map(Number);
    const [eh, em] = String(end || '00:00').split(':').map(Number);
    return Math.max(0, Number((((eh * 60 + em) - (sh * 60 + sm)) / 60).toFixed(2)));
  }

  function saveFieldAttendanceCheckOut(payload = {}) {
    const createdAt = payload.createdAt || nowIso();
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    const workDate = payload.workDate || payload.work_date || createdAt.slice(0, 10);
    const attendance = payload.attendanceId
      ? db.project.prepare('SELECT * FROM crew_attendance_logs WHERE attendance_log_id = ?').get(payload.attendanceId)
      : db.project.prepare('SELECT * FROM crew_attendance_logs WHERE project_id = ? AND work_date = ? AND worker_name_ko = ? ORDER BY created_at DESC LIMIT 1').get(projectId, workDate, payload.workerNameKo || payload.worker_name_ko || '작업자');
    if (!attendance) throw new Error('Attendance log not found');
    const checkOutTime = payload.checkOutTime || payload.check_out_time || new Date().toTimeString().slice(0, 5);
    const workHours = Number(payload.workHours || payload.work_hours || timeDiffHours(attendance.check_in_time, checkOutTime));
    const laborCost = Math.round(Number(attendance.daily_wage || payload.dailyWage || 0) * (workHours / 8));
    db.project.prepare('UPDATE crew_attendance_logs SET check_out_time = ?, work_hours = ?, labor_cost = ?, notes_ko = ? WHERE attendance_log_id = ?')
      .run(checkOutTime, workHours, laborCost, payload.notesKo || payload.notes_ko || attendance.notes_ko || '', attendance.attendance_log_id);
    db.project.prepare(`
      INSERT INTO labor_cost_records (
        labor_cost_record_id, crew_allocation_id, crew_member_id, project_id,
        cost_capture_entry_id, planned_labor_cost, actual_labor_cost,
        variance_amount, variance_rate, cost_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`LABOR-FIELD-${attendance.attendance_log_id}`, 'FIELD_MOBILE', attendance.worker_name_ko, projectId, null, 0, laborCost, laborCost, 0, 'ACTUAL_RECORDED', createdAt, createdAt);
    writeOperationalLog({ actionType: 'FIELD_ATTENDANCE_CHECK_OUT', actor: attendance.worker_name_ko, projectId, messageKo: `모바일 퇴근 체크: ${workHours}시간 / 노무비 ${laborCost.toLocaleString('ko-KR')}원`, actionKo: '퇴근 체크', level: 'INFO', payload: { attendanceId: attendance.attendance_log_id, workHours, laborCost }, reasonKo: '출역 기반 노무비 자동 반영', createdAt });
    return { attendanceId: attendance.attendance_log_id, workHours, laborCost, attendance: db.project.prepare('SELECT * FROM crew_attendance_logs WHERE attendance_log_id = ?').get(attendance.attendance_log_id), fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function createFieldDailyReport(payload = {}) {
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    const report = createDailySiteReportFromSchedule({ projectId, reportDate: payload.reportDate || payload.report_date || new Date().toISOString().slice(0, 10), weatherKo: payload.weatherKo || payload.weather_ko || '맑음', issueSummaryKo: payload.issueSummaryKo || payload.issue_summary_ko || payload.specialNotesKo || '특이사항 없음', managerKo: payload.managerKo || payload.manager_ko || payload.actor || '팀장', actor: 'CEO' });
    db.project.prepare('UPDATE daily_site_report_items SET work_content_ko = ?, crew_summary_json = ?, material_summary_json = ?, delay_reason_ko = ?, tomorrow_process_ko = ?, manager_ko = ? WHERE report_id = ?')
      .run(payload.workContentKo || payload.work_content_ko || '모바일 공사일보 작성', toJson({ crewCount: Number(payload.crewCount || payload.crew_count || 0), noteKo: payload.crewNoteKo || '' }), toJson({ usedMaterialsKo: payload.usedMaterialsKo || payload.used_materials_ko || '' }), payload.delayReasonKo || payload.delay_reason_ko || '', payload.tomorrowProcessKo || payload.tomorrow_process_ko || '', payload.managerKo || payload.manager_ko || payload.actor || '팀장', report.reportId);
    if (payload.delayReasonKo || payload.delay_reason_ko) {
      upsertCeoDecisionItem({ decisionId: `CEO-FIELD-DELAY-${report.reportId}`, sourceModule: 'FieldMobile', entityType: 'DailySiteReport', entityId: report.reportId, decisionType: 'SCHEDULE_DELAY_REPORTED', titleKo: '현장 지연 사유 입력', projectId, financialImpact: 0, riskLevel: 'ORANGE', requiredActionKo: '지연 사유 확인', payload });
    }
    if (payload.filePath || payload.file_path) saveSiteMediaFile({ projectId, reportId: report.reportId, relatedEntityType: 'DailySiteReport', relatedEntityId: report.reportId, fileName: payload.fileName || '공사일보사진.jpg', filePath: payload.filePath || payload.file_path, caption: payload.caption || '공사일보 첨부 사진', uploadedBy: payload.actor || '팀장' });
    return { ...report, fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function createFieldMaterialReceiving(payload = {}) {
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    const result = createMaterialReceivingLog({ projectId, purchaseOrderId: payload.purchaseOrderId || payload.purchase_order_id || `PO-${projectId}`, receivedItems: payload.receivedItems || payload.items || [{ itemNameKo: payload.itemNameKo || payload.item_name_ko || '자재', specificationKo: payload.specificationKo || payload.specification_ko || 'UNKNOWN', orderedQuantity: Number(payload.orderedQuantity || payload.ordered_quantity || 0), receivedQuantity: Number(payload.receivedQuantity || payload.received_quantity || 0), unit: payload.unit || 'EA', supplierNameKo: payload.supplierNameKo || payload.supplier_name_ko || 'UNKNOWN', damageOrMissing: Boolean(payload.damageOrMissing || payload.damage_or_missing), notesKo: payload.notesKo || payload.notes_ko || '' }], actor: 'CEO' });
    if (payload.filePath || payload.file_path) saveSiteMediaFile({ projectId, relatedEntityType: 'MaterialReceiving', relatedEntityId: payload.purchaseOrderId || payload.purchase_order_id || `PO-${projectId}`, fileName: payload.fileName || '자재입고사진.jpg', filePath: payload.filePath || payload.file_path, caption: payload.caption || '자재입고 첨부 사진', uploadedBy: payload.actor || '팀장' });
    return { ...result, fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function saveFieldInspectionResult(payload = {}) {
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    let checklistId = payload.checklistId || payload.checklist_id;
    if (!checklistId) checklistId = createInspectionChecklistFromSchedule({ projectId, processNameKo: payload.processNameKo || payload.process_name_ko || '현장 검수', actor: 'CEO' }).checklistId;
    const defaultItem = db.project.prepare('SELECT * FROM inspection_checklist_items WHERE checklist_id = ? ORDER BY critical_flag DESC, item_id ASC LIMIT 1').get(checklistId);
    const results = payload.results || [{
      itemId: payload.itemId || payload.item_id || defaultItem?.item_id,
      checkItemKo: payload.checkItemKo || payload.check_item_ko || defaultItem?.check_item_ko || '모바일 검수 항목',
      resultStatus: payload.resultStatus || payload.result_status || payload.result || 'PASS',
      actionRequiredKo: payload.actionRequiredKo || payload.action_required_ko || ''
    }];
    const result = saveInspectionChecklistResults({ projectId, checklistId, results, actor: 'CEO' });
    if (payload.filePath || payload.file_path) saveSiteMediaFile({ projectId, relatedEntityType: 'Inspection', relatedEntityId: result.inspectionResultId, fileName: payload.fileName || '검수사진.jpg', filePath: payload.filePath || payload.file_path, caption: payload.caption || '검수 첨부 사진', uploadedBy: payload.actor || '팀장' });
    return { ...result, fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function createFieldChangeOrderRequest(payload = {}) {
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    const result = createExecutionChangeOrder({ projectId, siteNameKo: payload.siteNameKo || payload.site_name_ko || '현장', requestedByKo: payload.requestedByKo || payload.requested_by_ko || payload.actor || '마스터', titleKo: payload.titleKo || payload.title_ko || '모바일 추가공사 요청', changeContentKo: payload.changeContentKo || payload.change_content_ko || '현장 추가 작업', changeReasonKo: payload.changeReasonKo || payload.change_reason_ko || '현장 조건 변경', additionalAmount: Number(payload.additionalAmount || payload.additional_amount || 0), additionalCost: Number(payload.additionalCost || payload.additional_cost || 0), scheduleImpactDays: Number(payload.scheduleImpactDays || payload.schedule_impact_days || 0), customerApprovalStatus: payload.customerApprovalStatus || payload.customer_approval_status || 'PENDING', actor: 'CEO' });
    if (payload.filePath || payload.file_path) saveSiteMediaFile({ projectId, relatedEntityType: 'ChangeOrder', relatedEntityId: result.changeOrderId, fileName: payload.fileName || '추가공사사진.jpg', filePath: payload.filePath || payload.file_path, caption: payload.caption || '추가공사 첨부 사진', uploadedBy: payload.actor || '마스터' });
    return { ...result, fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function createFieldDefectReport(payload = {}) {
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    const result = createDefectReport({ projectId, siteNameKo: payload.siteNameKo || payload.site_name_ko || '현장', defectLocationKo: payload.defectLocationKo || payload.defect_location_ko || '현장', defectTypeKo: payload.defectTypeKo || payload.defect_type_ko || '하자', severity: payload.severity || 'MEDIUM', rootCauseKo: payload.rootCauseKo || payload.root_cause_ko || '원인 확인 필요', estimatedCost: Number(payload.estimatedCost || payload.estimated_cost || 0), managerKo: payload.managerKo || payload.manager_ko || '현장관리자', actor: 'CEO' });
    if (payload.filePath || payload.file_path) saveSiteMediaFile({ projectId, relatedEntityType: 'Defect', relatedEntityId: result.defectId, fileName: payload.fileName || '하자사진.jpg', filePath: payload.filePath || payload.file_path, caption: payload.caption || '하자 접수 사진', uploadedBy: payload.actor || '마스터' });
    return { ...result, fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function saveFieldSignature(payload = {}) {
    const createdAt = payload.createdAt || nowIso();
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    const id = payload.id || `FSIG-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO field_signatures (
        id, project_id, related_entity_type, related_entity_id, signer_name,
        signer_role, signature_text, signed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM field_signatures WHERE id = ?), ?))
    `).run(id, projectId, payload.relatedEntityType || payload.related_entity_type || 'FieldSignature', payload.relatedEntityId || payload.related_entity_id || 'FIELD', payload.signerName || payload.signer_name || '고객', payload.signerRole || payload.signer_role || '고객', payload.signatureText || payload.signature_text || payload.signerName || '서명', payload.signedAt || payload.signed_at || createdAt, id, createdAt);
    writeOperationalLog({ actionType: 'FIELD_SIGNATURE_SAVED', actor: payload.signerName || payload.signer_name || '고객', projectId, messageKo: '고객 서명 placeholder가 저장되었습니다.', actionKo: '고객 서명', level: 'INFO', payload: { signatureId: id }, reasonKo: payload.relatedEntityType || payload.related_entity_type || '현장 확인', createdAt });
    return { signatureId: id, signature: db.project.prepare('SELECT * FROM field_signatures WHERE id = ?').get(id), fieldMobileData: getFieldMobileCenterData({ projectId }) };
  }

  function createFieldRiskReport(payload = {}) {
    const createdAt = payload.createdAt || nowIso();
    const projectId = payload.projectId || payload.project_id || 'FIELD-MOBILE-DEMO';
    ensureExecutionContextForRecord(projectId);
    const id = payload.id || `FRISK-${projectId}-${Date.now()}`;
    const severity = payload.severity || 'NORMAL';
    db.project.prepare(`
      INSERT OR REPLACE INTO field_risk_reports (
        id, project_id, risk_type, description, severity, immediate_action_taken,
        photo_status, reported_by, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM field_risk_reports WHERE id = ?), ?))
    `).run(id, projectId, payload.riskType || payload.risk_type || '기타', payload.description || '현장 위험 보고', severity, payload.immediateActionTaken || payload.immediate_action_taken ? 1 : 0, payload.filePath || payload.file_path ? 'PHOTO_ATTACHED' : 'PHOTO_PLACEHOLDER', payload.reportedBy || payload.reported_by || payload.actor || 'FIELD', 'OPEN', id, createdAt);
    if (payload.filePath || payload.file_path) saveSiteMediaFile({ projectId, relatedEntityType: 'FieldRiskReport', relatedEntityId: id, fileName: payload.fileName || '위험보고사진.jpg', filePath: payload.filePath || payload.file_path, caption: payload.caption || '위험 보고 사진', uploadedBy: payload.reportedBy || payload.actor || 'FIELD' });
    if (severity === 'RED') {
      upsertRedAlertEvent({ redAlertId: `RED-FIELD-RISK-${id}`, sourceModule: 'FieldMobile', entityId: id, projectId, titleKo: '현장 RED 위험 보고', reasonKo: payload.description || '현장에서 RED 위험이 보고되었습니다.', severity: 'RED', financialImpact: Number(payload.financialImpact || 0), blockingRequired: true, payload }, createdAt);
      upsertCeoDecisionItem({ decisionId: `CEO-FIELD-RISK-${id}`, sourceModule: 'FieldMobile', entityType: 'FieldRiskReport', entityId: id, decisionType: 'FIELD_RED_RISK', titleKo: '현장 RED 위험 보고', projectId, siteNameKo: projectId, financialImpact: Number(payload.financialImpact || 0), riskLevel: 'RED', requiredActionKo: '즉시 현장 확인', payload }, createdAt);
    }
    writeOperationalLog({ actionType: 'FIELD_RISK_REPORT', actor: payload.reportedBy || payload.actor || 'FIELD', projectId, messageKo: `현장 위험 보고: ${severity}`, actionKo: '위험 보고', level: severity === 'RED' ? 'RED' : severity === 'ORANGE' ? 'WARNING' : 'INFO', payload: { riskReportId: id, severity }, reasonKo: payload.description || '', createdAt });
    return { riskReportId: id, riskReport: db.project.prepare('SELECT * FROM field_risk_reports WHERE id = ?').get(id), dashboardData: getDashboardData(), fieldMobileData: getFieldMobileCenterData({ projectId }) };
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

  function normalizeMasterType(type = '') {
    const normalized = String(type);
    const map = {
      process: 'process',
      material: 'material',
      vendor: 'vendor',
      labor: 'labor',
      equipment: 'equipment',
      standardItem: 'standardItem',
      standard_item: 'standardItem'
    };
    if (!map[normalized]) throw new Error(`Unsupported master data type: ${type}`);
    return map[normalized];
  }

  function getMasterRows() {
    return {
      processes: db.master.prepare('SELECT * FROM process_master ORDER BY major_category, process_name').all(),
      materials: db.master.prepare('SELECT * FROM material_master ORDER BY material_category, material_name').all(),
      vendors: db.master.prepare('SELECT * FROM vendor_master ORDER BY vendor_name').all(),
      labor: db.master.prepare('SELECT * FROM labor_master ORDER BY process, role').all(),
      equipment: db.master.prepare('SELECT * FROM equipment_master ORDER BY equipment_type, equipment_name').all(),
      standardItems: db.master.prepare('SELECT * FROM standard_estimate_items ORDER BY estimate_type, process, item_name').all()
    };
  }

  function getActiveStandardEstimateItems(estimateType = null) {
    return db.master.prepare(`
      SELECT *
      FROM standard_estimate_items
      WHERE is_active = 1
        AND (? IS NULL OR estimate_type = ?)
      ORDER BY is_mandatory DESC, process, item_name
    `).all(estimateType, estimateType);
  }

  function buildMasterDataUsageSummary(estimateType) {
    const standardItems = getActiveStandardEstimateItems(estimateType);
    const materials = db.master.prepare('SELECT * FROM material_master WHERE is_active = 1 ORDER BY material_name LIMIT 100').all();
    const vendors = db.master.prepare('SELECT * FROM vendor_master WHERE is_active = 1 ORDER BY reliability_score DESC, vendor_name LIMIT 100').all();
    return {
      estimateType,
      sourceStatus: standardItems.length > 0 ? 'MASTER_DATA_ACTIVE' : 'FALLBACK_ACTIVE',
      displayStatusKo: standardItems.length > 0 ? '기준 데이터 기반 항목 사용 가능' : '기준 데이터가 없어 기존 fallback 계산을 사용합니다.',
      standardItemCount: standardItems.length,
      materialCount: materials.length,
      vendorCount: vendors.length,
      standardItems: standardItems.slice(0, 30),
      materials: materials.slice(0, 20),
      vendors: vendors.slice(0, 20)
    };
  }

  function createMasterDataItem({ type, payload = {}, actor = 'CEO' }) {
    const normalized = normalizeMasterType(type);
    const createdAt = nowIso();
    const id = payload.id || `MD-${normalized}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    if (normalized === 'process') {
      db.master.prepare(`
        INSERT OR REPLACE INTO process_master (
          id, major_category, middle_category, minor_category, process_name,
          default_unit, default_labor_qty, predecessor_process, successor_process,
          risk_level, inspection_required, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM process_master WHERE id = ?), ?), ?)
      `).run(
        id,
        payload.majorCategory || payload.major_category || '공통',
        payload.middleCategory || payload.middle_category || '공통',
        payload.minorCategory || payload.minor_category || '공통',
        payload.processName || payload.process_name || '공정명 미입력',
        payload.defaultUnit || payload.default_unit || '',
        Number(payload.defaultLaborQty ?? payload.default_labor_qty ?? 0),
        payload.predecessorProcess || payload.predecessor_process || '',
        payload.successorProcess || payload.successor_process || '',
        payload.riskLevel || payload.risk_level || 'NORMAL',
        payload.inspectionRequired ? 1 : 0,
        normalizeActive(payload.isActive ?? payload.is_active ?? true),
        id,
        createdAt,
        createdAt
      );
    }

    if (normalized === 'material') {
      db.master.prepare(`
        INSERT OR REPLACE INTO material_master (
          id, material_category, material_name, specification, brand, unit,
          default_unit_price, latest_unit_price, recommended_vendor,
          applied_process, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM material_master WHERE id = ?), ?), ?)
      `).run(
        id,
        payload.materialCategory || payload.material_category || 'material',
        payload.materialName || payload.material_name || '자재명 미입력',
        payload.specification || 'UNKNOWN',
        payload.brand || 'UNKNOWN',
        payload.unit || '',
        toInteger(payload.defaultUnitPrice ?? payload.default_unit_price ?? 0),
        toInteger(payload.latestUnitPrice ?? payload.latest_unit_price ?? payload.defaultUnitPrice ?? 0),
        payload.recommendedVendor || payload.recommended_vendor || '',
        payload.appliedProcess || payload.applied_process || '',
        normalizeActive(payload.isActive ?? payload.is_active ?? true),
        id,
        createdAt,
        createdAt
      );
    }

    if (normalized === 'vendor') {
      db.master.prepare(`
        INSERT OR REPLACE INTO vendor_master (
          id, vendor_name, vendor_type, process_scope, contact, region,
          default_payment_terms, reliability_score, is_active, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM vendor_master WHERE id = ?), ?), ?)
      `).run(
        id,
        payload.vendorName || payload.vendor_name || '업체명 미입력',
        payload.vendorType || payload.vendor_type || 'supplier',
        payload.processScope || payload.process_scope || '',
        payload.contact || 'UNKNOWN',
        payload.region || 'UNKNOWN',
        payload.defaultPaymentTerms || payload.default_payment_terms || 'UNKNOWN',
        Number(payload.reliabilityScore ?? payload.reliability_score ?? 70),
        normalizeActive(payload.isActive ?? payload.is_active ?? true),
        payload.notes || '',
        id,
        createdAt,
        createdAt
      );
    }

    if (normalized === 'labor') {
      db.master.prepare(`
        INSERT OR REPLACE INTO labor_master (
          id, role, process, default_daily_wage, default_productivity,
          skill_level, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM labor_master WHERE id = ?), ?), ?)
      `).run(
        id,
        payload.role || '역할 미입력',
        payload.process || '',
        toInteger(payload.defaultDailyWage ?? payload.default_daily_wage ?? 0),
        Number(payload.defaultProductivity ?? payload.default_productivity ?? 1),
        payload.skillLevel || payload.skill_level || 'NORMAL',
        normalizeActive(payload.isActive ?? payload.is_active ?? true),
        id,
        createdAt,
        createdAt
      );
    }

    if (normalized === 'equipment') {
      db.master.prepare(`
        INSERT OR REPLACE INTO equipment_master (
          id, equipment_name, equipment_type, unit, default_unit_price,
          applied_process, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM equipment_master WHERE id = ?), ?), ?)
      `).run(
        id,
        payload.equipmentName || payload.equipment_name || '장비명 미입력',
        payload.equipmentType || payload.equipment_type || 'equipment',
        payload.unit || '',
        toInteger(payload.defaultUnitPrice ?? payload.default_unit_price ?? 0),
        payload.appliedProcess || payload.applied_process || '',
        normalizeActive(payload.isActive ?? payload.is_active ?? true),
        id,
        createdAt,
        createdAt
      );
    }

    if (normalized === 'standardItem') {
      db.master.prepare(`
        INSERT OR REPLACE INTO standard_estimate_items (
          id, item_name, process, default_unit, default_customer_unit_price,
          default_material_cost, default_labor_cost, default_subcontract_cost,
          default_margin_rate, estimate_type, is_mandatory, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM standard_estimate_items WHERE id = ?), ?), ?)
      `).run(
        id,
        payload.itemName || payload.item_name || '표준 항목명 미입력',
        payload.process || '',
        payload.defaultUnit || payload.default_unit || '',
        toInteger(payload.defaultCustomerUnitPrice ?? payload.default_customer_unit_price ?? 0),
        toInteger(payload.defaultMaterialCost ?? payload.default_material_cost ?? 0),
        toInteger(payload.defaultLaborCost ?? payload.default_labor_cost ?? 0),
        toInteger(payload.defaultSubcontractCost ?? payload.default_subcontract_cost ?? 0),
        Number(payload.defaultMarginRate ?? payload.default_margin_rate ?? 0),
        payload.estimateType || payload.estimate_type || 'bathroom_remodel',
        payload.isMandatory ?? payload.is_mandatory ? 1 : 0,
        normalizeActive(payload.isActive ?? payload.is_active ?? true),
        id,
        createdAt,
        createdAt
      );
    }

    recordAction({
      actionType: 'MASTER_DATA_UPSERT',
      actor,
      projectId: 'GLOBAL',
      reasonKo: `기준 데이터 ${normalized} 저장`,
      payload: { type: normalized, id }
    });

    return { id, masterData: getMasterDataCenterData({ runValidation: true }) };
  }

  function runMasterDataValidation({ actor = 'CEO' } = {}) {
    const createdAt = nowIso();
    const rows = getMasterRows();
    const warnings = validateMasterDataSets(rows);
    db.master.prepare("UPDATE master_data_validation_logs SET status = 'RESOLVED' WHERE status = 'OPEN'").run();
    const insert = db.master.prepare(`
      INSERT OR REPLACE INTO master_data_validation_logs (
        id, entity_type, entity_id, warning_type, message_ko,
        severity, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    warnings.forEach((warning) => {
      insert.run(warning.id, warning.entityType, warning.entityId, warning.warningType, warning.messageKo, warning.severity, 'OPEN', createdAt);
    });
    recordAction({
      actionType: 'MASTER_DATA_VALIDATE',
      actor,
      projectId: 'GLOBAL',
      reasonKo: `기준 데이터 검증 ${warnings.length}건`,
      payload: { warningCount: warnings.length }
    });
    return warnings;
  }

  function getMasterDataCenterData({ runValidation = false } = {}) {
    if (runValidation) runMasterDataValidation();
    const rows = getMasterRows();
    const validationLogs = db.master.prepare(`
      SELECT *
      FROM master_data_validation_logs
      WHERE status = 'OPEN'
      ORDER BY CASE severity WHEN 'RED' THEN 0 WHEN 'ORANGE' THEN 1 ELSE 2 END, created_at DESC
      LIMIT 200
    `).all();
    return {
      summary: {
        processCount: rows.processes.length,
        materialCount: rows.materials.length,
        vendorCount: rows.vendors.length,
        laborCount: rows.labor.length,
        equipmentCount: rows.equipment.length,
        standardItemCount: rows.standardItems.length,
        validationWarningCount: validationLogs.length,
        displayStatusKo: rows.standardItems.length > 0 ? '기준 데이터 사용 가능' : '기준 데이터 입력 대기'
      },
      ...rows,
      validationLogs,
      estimateUsage: {
        bathroom: buildMasterDataUsageSummary('bathroom_remodel'),
        kitchen: buildMasterDataUsageSummary('kitchen_remodel'),
        full: buildMasterDataUsageSummary('full_remodel')
      },
      emptyState: Object.values(rows).every((list) => Array.isArray(list) && list.length === 0)
    };
  }

  function importMasterDataCsv({ type, csvText = '', actor = 'CEO' }) {
    const normalized = normalizeMasterType(type);
    const rows = parseMasterCsv(csvText);
    const ids = rows.map((row) => createMasterDataItem({ type: normalized, payload: row, actor }).id);
    return { importedCount: ids.length, ids, masterData: getMasterDataCenterData({ runValidation: true }) };
  }

  function exportMasterDataCsv({ type }) {
    const normalized = normalizeMasterType(type);
    const rows = getMasterRows();
    const keyMap = {
      process: 'processes',
      material: 'materials',
      vendor: 'vendors',
      labor: 'labor',
      equipment: 'equipment',
      standardItem: 'standardItems'
    };
    return { type: normalized, csv: buildCsv(rows[keyMap[normalized]] || []) };
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

  function saveMaterialPriceHistory({
    materialCategory = 'material',
    materialName,
    specification = 'UNKNOWN',
    brand = 'UNKNOWN',
    vendorId = 'MANUAL_VENDOR',
    vendorName,
    quotedUnitPrice = 0,
    actualUnitPrice = 0,
    unit = 'EA',
    sourceType = 'MANUAL',
    relatedPurchaseOrderId = null,
    recordedAt = nowIso()
  }) {
    if (!materialName || !vendorName) {
      throw new Error('Material price history requires materialName and vendorName.');
    }
    const createdAt = nowIso();
    const currentPrice = toInteger(actualUnitPrice || quotedUnitPrice);
    const previous = db.master.prepare(`
      SELECT *
      FROM material_price_history
      WHERE material_name = ? AND specification = ? AND vendor_name = ?
      ORDER BY recorded_at DESC, created_at DESC
      LIMIT 1
    `).get(materialName, specification, vendorName);

    const id = `MPH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.master.prepare(`
      INSERT INTO material_price_history (
        id, material_category, material_name, specification, brand,
        vendor_id, vendor_name, quoted_unit_price, actual_unit_price, unit,
        source_type, related_purchase_order_id, recorded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      materialCategory,
      materialName,
      specification,
      brand,
      vendorId,
      vendorName,
      toInteger(quotedUnitPrice),
      currentPrice,
      unit,
      sourceType,
      relatedPurchaseOrderId,
      recordedAt,
      createdAt
    );

    let alert = null;
    const previousPrice = Number(previous?.actual_unit_price || previous?.quoted_unit_price || 0);
    const varianceRate = calculateVarianceRate(previousPrice, currentPrice);
    if (previousPrice > 0 && Math.abs(varianceRate) >= 0.08) {
      alert = createVendorPriceAlert(buildPriceAlert({
        alertType: varianceRate > 0 ? 'PRICE_INCREASE' : 'PRICE_DECREASE',
        materialName,
        vendorName,
        previousPrice,
        currentPrice,
        reason: `${materialName} ${vendorName} 단가가 이전 대비 ${(varianceRate * 100).toFixed(1)}% 변동되었습니다.`
      }), createdAt);
      createVendorPriceRecommendation(buildEstimatePriceRecommendation({
        recommendationType: 'PRICE_CHANGE_BUFFER',
        targetEstimateType: inferEstimateTypeFromMaterial(materialCategory, materialName),
        targetProcess: materialCategory,
        materialName,
        vendorName,
        varianceRate
      }), createdAt);
    }

    const quoteActualVariance = calculateVarianceRate(toInteger(quotedUnitPrice), currentPrice);
    if (toInteger(quotedUnitPrice) > 0 && Math.abs(quoteActualVariance) >= 0.08) {
      createVendorPriceAlert(buildPriceAlert({
        alertType: 'QUOTE_ACTUAL_VARIANCE',
        materialName,
        vendorName,
        previousPrice: toInteger(quotedUnitPrice),
        currentPrice,
        reason: `${materialName} 견적 단가와 실제 매입 단가 차이가 ${(quoteActualVariance * 100).toFixed(1)}%입니다.`
      }), createdAt);
    }

    recomputeVendorReliabilityScore(vendorId, vendorName, createdAt);
    return { priceHistoryId: id, alert, intelligenceData: getVendorPriceIntelligenceData() };
  }

  function createVendorPriceAlert(alert, createdAt = nowIso()) {
    const id = `VPA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.master.prepare(`
      INSERT INTO vendor_price_alerts (
        id, alert_type, material_name, vendor_name, severity, previous_price,
        current_price, variance_rate, reason, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      alert.alertType,
      alert.materialName,
      alert.vendorName,
      alert.severity,
      toInteger(alert.previousPrice),
      toInteger(alert.currentPrice),
      Number(alert.varianceRate || 0),
      alert.reason,
      'OPEN',
      createdAt
    );
    return db.master.prepare('SELECT * FROM vendor_price_alerts WHERE id = ?').get(id);
  }

  function createVendorPriceRecommendation(recommendation, createdAt = nowIso()) {
    const id = `VPR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    db.master.prepare(`
      INSERT INTO vendor_price_recommendations (
        id, recommendation_type, target_estimate_type, target_process,
        material_name, vendor_name, adjustment_type, adjustment_value,
        reason, status, created_at, approved_at, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      recommendation.recommendationType,
      recommendation.targetEstimateType,
      recommendation.targetProcess,
      recommendation.materialName,
      recommendation.vendorName,
      recommendation.adjustmentType,
      Number(recommendation.adjustmentValue || 0),
      recommendation.reason,
      'PENDING_APPROVAL',
      createdAt,
      null,
      null
    );
    return db.master.prepare('SELECT * FROM vendor_price_recommendations WHERE id = ?').get(id);
  }

  function decideVendorPriceRecommendation({ recommendationId, decision, actor = 'CEO', reasonKo = '' }) {
    const normalized = String(decision || '').toUpperCase();
    if (!['APPROVED', 'REJECTED', 'APPLIED'].includes(normalized)) {
      throw new Error('Vendor price recommendation decision must be APPROVED, REJECTED, or APPLIED.');
    }
    const row = db.master.prepare('SELECT * FROM vendor_price_recommendations WHERE id = ?').get(recommendationId);
    if (!row) throw new Error(`Vendor price recommendation not found: ${recommendationId}`);
    const createdAt = nowIso();
    db.master.prepare(`
      UPDATE vendor_price_recommendations
      SET status = ?, approved_at = CASE WHEN ? IN ('APPROVED', 'APPLIED') THEN ? ELSE approved_at END,
          approved_by = CASE WHEN ? IN ('APPROVED', 'APPLIED') THEN ? ELSE approved_by END
      WHERE id = ?
    `).run(normalized, normalized, createdAt, normalized, actor, recommendationId);
    if (['APPROVED', 'APPLIED'].includes(normalized)) {
      db.project.prepare(`
        INSERT OR REPLACE INTO estimate_calibration_rules (
          id, source_project_id, source_category, rule_type, adjustment_target,
          adjustment_value, reason, status, created_at, estimate_type, process_type,
          condition_json, adjustment_type, confidence_score, source_project_ids,
          auto_generated, requires_approval, approved_at, approved_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM estimate_calibration_rules WHERE id = ?), ?),
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `VENDOR-${row.id}`,
        'VENDOR_PRICE_INTELLIGENCE',
        row.material_name,
        row.adjustment_type,
        row.target_process,
        Number(row.adjustment_value || 0),
        row.reason,
        'APPROVED',
        `VENDOR-${row.id}`,
        createdAt,
        row.target_estimate_type,
        row.target_process,
        toJson({ materialName: row.material_name, vendorName: row.vendor_name, source: 'vendor_price_recommendation' }),
        row.adjustment_type,
        0.78,
        toJson(['VENDOR_PRICE_INTELLIGENCE']),
        1,
        0,
        createdAt,
        actor
      );
    }
    recordAction({
      actionType: `VENDOR_PRICE_RECOMMENDATION_${normalized}`,
      actor,
      projectId: 'GLOBAL',
      reasonKo: reasonKo || `${row.material_name} 단가 추천 ${normalized}`,
      payload: { recommendationId, beforeStatus: row.status, afterStatus: normalized }
    });
    return { recommendation: db.master.prepare('SELECT * FROM vendor_price_recommendations WHERE id = ?').get(recommendationId), intelligenceData: getVendorPriceIntelligenceData(), dashboardData: getDashboardData() };
  }

  function importMaterialPriceHistoryCsv({ csvText = '' }) {
    const rows = parseVendorPriceCsv(csvText);
    const results = rows.map((row) => saveMaterialPriceHistory({
      materialName: row.materialName,
      specification: row.specification || 'UNKNOWN',
      brand: row.brand || 'UNKNOWN',
      vendorName: row.vendorName,
      quotedUnitPrice: row.quotedUnitPrice,
      actualUnitPrice: row.actualUnitPrice,
      unit: row.unit || 'EA',
      sourceType: 'IMPORT',
      recordedAt: row.recordedAt || nowIso()
    }).priceHistoryId);
    return { importedCount: results.length, priceHistoryIds: results, intelligenceData: getVendorPriceIntelligenceData() };
  }

  function recomputeVendorReliabilityScore(vendorId = 'MANUAL_VENDOR', vendorName = 'UNKNOWN', updatedAt = nowIso()) {
    const history = db.master.prepare('SELECT * FROM material_price_history WHERE vendor_name = ?').all(vendorName);
    const alerts = db.master.prepare('SELECT * FROM vendor_price_alerts WHERE vendor_name = ?').all(vendorName);
    const repeatUsageCount = history.length;
    const priceVarianceRate = history.length > 1
      ? Math.max(...history.map((row, index) => {
        const previous = history[index + 1];
        return previous ? Math.abs(calculateVarianceRate(previous.actual_unit_price || previous.quoted_unit_price, row.actual_unit_price || row.quoted_unit_price)) : 0;
      }))
      : 0;
    const shortageCount = alerts.filter((row) => String(row.alert_type).includes('SHORTAGE')).length;
    const defectCount = alerts.filter((row) => String(row.alert_type).includes('DEFECT')).length;
    const paymentIssueCount = alerts.filter((row) => String(row.alert_type).includes('PAYMENT')).length;
    const score = calculateVendorReliabilityScore({
      onTimeRate: 1,
      shortageCount,
      defectCount,
      priceVarianceRate,
      paymentIssueCount,
      repeatUsageCount,
      manualRating: 80
    });
    const id = `VRS-${vendorId}-${vendorName}`.replace(/[^A-Za-z0-9_-]/g, '-');
    db.master.prepare(`
      INSERT OR REPLACE INTO vendor_reliability_scores (
        id, vendor_id, vendor_name, on_time_rate, shortage_count, defect_count,
        price_variance_rate, payment_issue_count, repeat_usage_count,
        manual_rating, vendor_score, reliability_level, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      vendorId,
      vendorName,
      1,
      shortageCount,
      defectCount,
      priceVarianceRate,
      paymentIssueCount,
      repeatUsageCount,
      80,
      score.vendorScore,
      score.reliabilityLevel,
      updatedAt
    );
    return db.master.prepare('SELECT * FROM vendor_reliability_scores WHERE id = ?').get(id);
  }

  function inferEstimateTypeFromMaterial(category, materialName) {
    const text = `${category} ${materialName}`.toLowerCase();
    if (text.includes('kitchen') || text.includes('sink') || text.includes('counter') || text.includes('주방') || text.includes('상판')) return 'kitchen_remodel';
    if (text.includes('full') || text.includes('floor') || text.includes('wallpaper') || text.includes('전체')) return 'full_remodel';
    return 'bathroom_remodel';
  }

  function getApprovedVendorPriceRecommendations(estimateType = null) {
    return db.master.prepare(`
      SELECT *
      FROM vendor_price_recommendations
      WHERE status IN ('APPROVED', 'APPLIED')
        AND (? IS NULL OR target_estimate_type = ?)
      ORDER BY adjustment_value DESC, created_at DESC
    `).all(estimateType, estimateType);
  }

  function applyApprovedVendorPriceRecommendationsToEstimate(estimate, estimateType = 'bathroom_remodel') {
    const recommendations = getApprovedVendorPriceRecommendations(estimateType);
    if (!recommendations.length) {
      return { estimate, vendorPriceIntelligence: { applied: false, appliedRecommendationCount: 0, adjustmentAmount: 0, recommendations: [] } };
    }
    const baseTotalCost = Number(estimate.total_cost ?? estimate.totalCost ?? 0);
    const totalRate = Math.min(0.35, recommendations.reduce((sum, row) => sum + Math.max(0, Number(row.adjustment_value || 0)), 0));
    const adjustmentAmount = Math.round(baseTotalCost * totalRate);
    const adjustedTotalCost = baseTotalCost + adjustmentAmount;
    const revenue = Number(estimate.revenue || 0);
    const expectedMargin = revenue - adjustedTotalCost;
    const expectedMarginRate = revenue > 0 ? expectedMargin / revenue : 0;
    const mapped = recommendations.map((row) => ({
      id: row.id,
      materialName: row.material_name,
      vendorName: row.vendor_name,
      adjustmentType: row.adjustment_type,
      adjustmentValue: row.adjustment_value,
      reasonKo: row.reason
    }));
    return {
      estimate: {
        ...estimate,
        total_cost: adjustedTotalCost,
        totalCost: adjustedTotalCost,
        expected_margin: expectedMargin,
        expectedMargin,
        expected_margin_rate: expectedMarginRate,
        expectedMarginRate,
        vendor_price_intelligence_applied: true,
        vendor_price_adjustment_amount: adjustmentAmount,
        vendor_price_recommendations: mapped
      },
      vendorPriceIntelligence: {
        applied: true,
        appliedRecommendationCount: recommendations.length,
        adjustmentAmount,
        adjustmentRate: totalRate,
        recommendations: mapped,
        displayMessageKo: '승인된 협력업체 단가/신뢰도 추천이 견적 원가 방어선에 반영되었습니다.'
      }
    };
  }

  function getVendorPriceComparisonRows() {
    const grouped = new Map();
    const rows = db.master.prepare('SELECT * FROM material_price_history ORDER BY recorded_at DESC, created_at DESC').all();
    rows.forEach((row) => {
      const key = `${row.material_name}||${row.specification}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    return Array.from(grouped.entries()).map(([key, groupRows]) => {
      const [materialName, specification] = key.split('||');
      const comparison = compareVendorPrices(groupRows);
      return {
        materialName,
        specification,
        lowestPrice: comparison.lowestPrice,
        averagePrice: comparison.averagePrice,
        latestPrice: comparison.latestPrice,
        previousPrice: comparison.previousPrice,
        varianceRate: comparison.varianceRate,
        riskLevel: comparison.riskLevel,
        recommendedVendor: comparison.recommendedVendor
      };
    });
  }

  function getVendorSelectionRecommendation({ materialName = '', specification = '' } = {}) {
    const rows = db.master.prepare(`
      SELECT h.*, s.vendor_score, s.reliability_level
      FROM material_price_history h
      LEFT JOIN vendor_reliability_scores s ON s.vendor_name = h.vendor_name
      WHERE (? = '' OR h.material_name = ?)
        AND (? = '' OR h.specification = ?)
      ORDER BY h.recorded_at DESC, h.created_at DESC
    `).all(materialName, materialName, specification, specification);
    return recommendVendor(rows.map((row) => ({
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      actualUnitPrice: row.actual_unit_price,
      quotedUnitPrice: row.quoted_unit_price,
      vendorScore: row.vendor_score,
      leadTimeDays: 3,
      defectCount: 0,
      shortageCount: 0
    })));
  }

  function getVendorPriceIntelligenceSummary() {
    const alertRows = db.master.prepare("SELECT severity, COUNT(*) AS count FROM vendor_price_alerts WHERE status = 'OPEN' GROUP BY severity").all();
    const pendingRecommendations = Number(db.master.prepare("SELECT COUNT(*) AS count FROM vendor_price_recommendations WHERE status = 'PENDING_APPROVAL'").get().count || 0);
    const riskyVendors = Number(db.master.prepare("SELECT COUNT(*) AS count FROM vendor_reliability_scores WHERE reliability_level IN ('주의', '위험')").get().count || 0);
    const historyCount = Number(db.master.prepare('SELECT COUNT(*) AS count FROM material_price_history').get().count || 0);
    const topIncreases = db.master.prepare(`
      SELECT material_name, vendor_name, previous_price, current_price, variance_rate, severity, reason
      FROM vendor_price_alerts
      WHERE status = 'OPEN' AND variance_rate > 0
      ORDER BY variance_rate DESC, created_at DESC
      LIMIT 5
    `).all();
    return {
      openAlertCount: alertRows.reduce((sum, row) => sum + Number(row.count || 0), 0),
      criticalAlertCount: Number(alertRows.find((row) => row.severity === 'CRITICAL')?.count || 0),
      highAlertCount: Number(alertRows.find((row) => row.severity === 'HIGH')?.count || 0),
      riskyVendorCount: riskyVendors,
      pendingRecommendationCount: pendingRecommendations,
      priceHistoryCount: historyCount,
      topPriceIncreases: topIncreases,
      displayStatusKo: historyCount > 0 ? '협력업체 단가 지능화 작동 중' : '단가 이력 입력 대기'
    };
  }

  function getVendorPriceIntelligenceData() {
    const priceHistory = db.master.prepare('SELECT * FROM material_price_history ORDER BY recorded_at DESC, created_at DESC LIMIT 200').all();
    const reliabilityScores = db.master.prepare('SELECT * FROM vendor_reliability_scores ORDER BY vendor_score DESC, updated_at DESC LIMIT 100').all();
    const alerts = db.master.prepare("SELECT * FROM vendor_price_alerts ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, created_at DESC LIMIT 100").all();
    const recommendations = db.master.prepare("SELECT * FROM vendor_price_recommendations ORDER BY CASE status WHEN 'PENDING_APPROVAL' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END, created_at DESC LIMIT 100").all();
    return {
      summary: getVendorPriceIntelligenceSummary(),
      priceHistory,
      comparisons: getVendorPriceComparisonRows(),
      reliabilityScores,
      alerts,
      recommendations,
      vendorSelection: getVendorSelectionRecommendation(),
      emptyState: priceHistory.length === 0 && alerts.length === 0 && recommendations.length === 0
    };
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

  function getFranchiseSourceData() {
    const estimates = [
      ...db.project.prepare("SELECT id AS estimate_id, customer_name, site_name, revenue, total_cost, expected_margin_rate, pce_decision, branch_id, created_at FROM bathroom_estimates").all(),
      ...db.project.prepare("SELECT id AS estimate_id, customer_name, site_name, revenue, total_cost, expected_margin_rate, pce_decision, branch_id, created_at FROM kitchen_estimates").all(),
      ...db.project.prepare("SELECT id AS estimate_id, customer_name, site_name, revenue, total_cost, expected_margin_rate, pce_decision, branch_id, created_at FROM full_remodeling_estimates").all()
    ];
    return {
      estimates,
      contracts: db.project.prepare("SELECT * FROM contracts").all(),
      profitDecisions: db.project.prepare("SELECT * FROM profit_decisions").all(),
      closings: db.project.prepare("SELECT * FROM project_closing_snapshots").all(),
      receivables: db.project.prepare("SELECT * FROM customer_payments").all(),
      payables: db.project.prepare("SELECT * FROM vendor_payments").all(),
      templates: db.project.prepare("SELECT * FROM profit_templates").all()
    };
  }

  function syncFranchiseRiskAlerts(createdAt = nowIso()) {
    ensureHeadquartersBranch();
    const branches = db.master.prepare("SELECT * FROM franchise_branches ORDER BY created_at DESC").all();
    const sourceData = getFranchiseSourceData();
    const metrics = branches.map((branch) => calculateBranchMetrics({ branch, ...sourceData }));
    const alerts = [];
    metrics.forEach((metric) => {
      const alert = shouldCreateBranchRiskAlert(metric);
      if (!alert) return;
      const id = `FRA-${metric.branchId}-${alert.alertType}`;
      db.master.prepare(`
        INSERT OR REPLACE INTO franchise_risk_alerts (
          id, branch_id, alert_type, severity, title, description, status, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, COALESCE((SELECT status FROM franchise_risk_alerts WHERE id = ?), 'OPEN'),
          COALESCE((SELECT created_at FROM franchise_risk_alerts WHERE id = ?), ?)
        )
      `).run(id, metric.branchId, alert.alertType, alert.severity, alert.title, alert.description, id, id, createdAt);
      alerts.push({ id, branchId: metric.branchId, ...alert, status: 'OPEN' });
    });
    return alerts;
  }

  function getFranchiseSummary() {
    ensureHeadquartersBranch();
    const sourceData = getFranchiseSourceData();
    const branches = db.master.prepare("SELECT * FROM franchise_branches ORDER BY created_at DESC").all();
    const metrics = branches.map((branch) => calculateBranchMetrics({ branch, ...sourceData }));
    const openAlerts = db.master.prepare("SELECT * FROM franchise_risk_alerts WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT 10").all();
    return {
      branchCount: branches.length,
      activeBranchCount: branches.filter((branch) => branch.status === 'ACTIVE').length,
      totalRevenue: metrics.reduce((sum, row) => sum + Number(row.totalRevenue || 0), 0),
      averageMarginRate: metrics.length ? Number((metrics.reduce((sum, row) => sum + Number(row.averageMarginRate || 0), 0) / metrics.length).toFixed(4)) : 0,
      lowMarginBranchCount: metrics.filter((row) => Number(row.averageMarginRate || 0) > 0 && Number(row.averageMarginRate || 0) < 0.25).length,
      pendingPackageCount: countRows(db.master, 'franchise_distribution_packages'),
      openRiskAlertCount: openAlerts.length,
      displayStatusKo: branches.length ? '지점 데이터 있음' : '등록된 지점이 없습니다.'
    };
  }

  function getFranchiseCenterData({ branchId = null } = {}) {
    ensureHeadquartersBranch();
    const createdAt = nowIso();
    syncFranchiseRiskAlerts(createdAt);
    const branches = db.master.prepare("SELECT * FROM franchise_branches ORDER BY CASE id WHEN 'HEADQUARTERS' THEN 0 ELSE 1 END, created_at DESC").all();
    const sourceData = getFranchiseSourceData();
    const branchMetrics = branches.map((branch) => calculateBranchMetrics({ branch, ...sourceData }));
    const packages = db.master.prepare("SELECT * FROM franchise_distribution_packages ORDER BY created_at DESC LIMIT 100").all().map((row) => ({
      ...row,
      payload: fromJson(row.payload_json, {})
    }));
    const packageStatuses = db.master.prepare("SELECT * FROM franchise_branch_package_status ORDER BY applied_at DESC, id DESC LIMIT 100").all();
    const policies = db.master.prepare("SELECT * FROM branch_profit_policies ORDER BY updated_at DESC").all();
    const feeRules = db.master.prepare("SELECT * FROM franchise_fee_rules ORDER BY created_at DESC").all();
    const feeRecords = db.master.prepare("SELECT * FROM franchise_fee_records ORDER BY created_at DESC LIMIT 100").all();
    const riskAlerts = db.master.prepare("SELECT * FROM franchise_risk_alerts ORDER BY CASE severity WHEN 'RED' THEN 0 WHEN 'ORANGE' THEN 1 ELSE 2 END, created_at DESC LIMIT 100").all();
    const templates = db.master.prepare("SELECT * FROM franchise_replication_templates ORDER BY created_at DESC LIMIT 50").all().map((row) => ({
      ...row,
      payload: fromJson(row.payload_json, {})
    }));
    const selectedBranch = branchId ? branches.find((branch) => branch.id === branchId) : branches[0];
    return {
      summary: getFranchiseSummary(),
      branches,
      branchMetrics,
      selectedBranch,
      packages,
      packageStatuses,
      policies,
      feeRules,
      feeRecords,
      riskAlerts,
      templates,
      emptyState: branches.length <= 1 && branchMetrics.every((metric) => metric.estimateCount === 0 && metric.contractCount === 0)
    };
  }

  function createFranchiseBranch(payload = {}) {
    ensureHeadquartersBranch();
    const createdAt = payload.createdAt || nowIso();
    const branchId = payload.branchId || `BR-${String(payload.branchCode || payload.branchName || Date.now()).replace(/[^A-Za-z0-9]/g, '').toUpperCase() || Date.now()}`;
    const branchCode = payload.branchCode || branchId.replace(/^BR-/, '').slice(0, 12);
    db.master.prepare(`
      INSERT OR REPLACE INTO franchise_branches (
        id, branch_name, branch_code, owner_name, contact, region, address,
        status, opened_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM franchise_branches WHERE id = ?), ?), ?)
    `).run(
      branchId,
      payload.branchName || payload.branch_name || '신규 지점',
      branchCode,
      payload.ownerName || payload.owner_name || 'UNKNOWN',
      payload.contact || 'UNKNOWN',
      payload.region || 'UNKNOWN',
      payload.address || 'UNKNOWN',
      payload.status || 'ACTIVE',
      payload.openedAt || payload.opened_at || createdAt.slice(0, 10),
      branchId,
      createdAt,
      createdAt
    );
    const hqPolicy = getBranchProfitPolicy('HEADQUARTERS');
    db.master.prepare(`
      INSERT OR IGNORE INTO branch_profit_policies (
        id, branch_id, min_margin_rate, scale_margin_rate, block_threshold,
        requires_hq_approval, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`BPP-${branchId}`, branchId, hqPolicy.min_margin_rate, hqPolicy.scale_margin_rate, hqPolicy.block_threshold, 1, createdAt, createdAt);
    insertNotification({
      level: 'INFO',
      messageKo: `프랜차이즈 지점 생성: ${payload.branchName || branchId}`,
      relatedProjectId: branchId,
      actionKo: '지점 생성',
      createdAt
    });
    return { branchId, branch: db.master.prepare("SELECT * FROM franchise_branches WHERE id = ?").get(branchId), franchiseData: getFranchiseCenterData({ branchId }) };
  }

  function buildDistributionPayload(packageType) {
    const type = packageType || 'MASTER_STANDARD';
    if (type === 'MASTER_DATA') return getMasterDataCenterData({ runValidation: false });
    if (type === 'VENDOR_INTELLIGENCE') return getVendorPriceIntelligenceData();
    if (type === 'BOARD_TEMPLATES') return db.project.prepare("SELECT * FROM design_board_templates ORDER BY created_at DESC").all();
    return {
      masterData: getMasterDataCenterData({ runValidation: false }).summary,
      pcePolicy: getBranchProfitPolicy('HEADQUARTERS'),
      calibrationSummary: getCalibrationSummary(),
      vendorSummary: getVendorPriceIntelligenceSummary()
    };
  }

  function publishFranchiseDistributionPackage(payload = {}) {
    ensureHeadquartersBranch();
    const createdAt = payload.createdAt || nowIso();
    const packageId = payload.packageId || `FDP-${Date.now()}`;
    const packageType = payload.packageType || payload.package_type || 'MASTER_STANDARD';
    const packagePayload = payload.payload || buildDistributionPayload(packageType);
    db.master.prepare(`
      INSERT OR REPLACE INTO franchise_distribution_packages (
        id, package_name, package_type, version, payload_json, status,
        created_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM franchise_distribution_packages WHERE id = ?), ?), ?)
    `).run(
      packageId,
      payload.packageName || payload.package_name || '본사 기준 패키지',
      packageType,
      payload.version || '1.0.0',
      toJson(packagePayload),
      payload.status || 'PUBLISHED',
      packageId,
      createdAt,
      payload.status === 'DRAFT' ? null : createdAt
    );
    return { packageId, package: db.master.prepare("SELECT * FROM franchise_distribution_packages WHERE id = ?").get(packageId), franchiseData: getFranchiseCenterData() };
  }

  function applyFranchisePackageToBranch(payload = {}) {
    const createdAt = payload.createdAt || nowIso();
    const branchId = payload.branchId || payload.branch_id || 'HEADQUARTERS';
    const packageId = payload.packageId || payload.package_id;
    const branch = db.master.prepare("SELECT * FROM franchise_branches WHERE id = ?").get(branchId);
    const distributionPackage = db.master.prepare("SELECT * FROM franchise_distribution_packages WHERE id = ?").get(packageId);
    if (!branch) throw new Error(`Branch not found: ${branchId}`);
    if (!distributionPackage) throw new Error(`Distribution package not found: ${packageId}`);
    const statusId = `FBPS-${branchId}-${packageId}`;
    db.master.prepare(`
      INSERT OR REPLACE INTO franchise_branch_package_status (
        id, branch_id, package_id, status, applied_at, error_message
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(statusId, branchId, packageId, 'APPLIED', createdAt, '');
    insertNotification({
      level: 'INFO',
      messageKo: `${branch.branch_name} 지점에 본사 기준 패키지를 적용했습니다.`,
      relatedProjectId: branchId,
      actionKo: '본사 기준 배포',
      createdAt
    });
    return { statusId, status: db.master.prepare("SELECT * FROM franchise_branch_package_status WHERE id = ?").get(statusId), franchiseData: getFranchiseCenterData({ branchId }) };
  }

  function createBranchProfitPolicy(payload = {}) {
    ensureHeadquartersBranch();
    const createdAt = payload.createdAt || nowIso();
    const branchId = payload.branchId || payload.branch_id || 'HEADQUARTERS';
    const hqApproved = Boolean(payload.hqApproved || payload.hq_approved || payload.approvedBy === 'HQ' || payload.approvedBy === 'CEO');
    if (branchId !== 'HEADQUARTERS' && !hqApproved) {
      const requestId = `APR-FRANCHISE-POLICY-${branchId}-${Date.now()}`;
      db.project.prepare(`
        INSERT OR REPLACE INTO approval_requests (
          request_id, source_module, entity_id, project_id, title_ko, amount, reason_ko,
          status, created_at, approved_at, approved_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        requestId,
        'FRANCHISE',
        branchId,
        branchId,
        '지점 수익 기준 변경 승인',
        0,
        payload.reasonKo || '본사 승인 없는 지점별 마진 기준 변경 요청',
        'PENDING',
        createdAt,
        null,
        null
      );
      return { approvalRequired: true, requestId, status: 'PENDING_HQ_APPROVAL', franchiseData: getFranchiseCenterData({ branchId }) };
    }
    const policyId = payload.policyId || `BPP-${branchId}-${Date.now()}`;
    db.master.prepare(`
      INSERT OR REPLACE INTO branch_profit_policies (
        id, branch_id, min_margin_rate, scale_margin_rate, block_threshold,
        requires_hq_approval, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM branch_profit_policies WHERE id = ?), ?), ?)
    `).run(
      policyId,
      branchId,
      Number(payload.minMarginRate ?? payload.min_margin_rate ?? 0.25),
      Number(payload.scaleMarginRate ?? payload.scale_margin_rate ?? 0.35),
      Number(payload.blockThreshold ?? payload.block_threshold ?? payload.minMarginRate ?? 0.25),
      branchId === 'HEADQUARTERS' ? 0 : 1,
      policyId,
      createdAt,
      createdAt
    );
    return { approvalRequired: false, policyId, policy: db.master.prepare("SELECT * FROM branch_profit_policies WHERE id = ?").get(policyId), franchiseData: getFranchiseCenterData({ branchId }) };
  }

  function calculateFranchiseFeeRecord(payload = {}) {
    ensureHeadquartersBranch();
    const createdAt = payload.createdAt || nowIso();
    const branchId = payload.branchId || payload.branch_id || 'HEADQUARTERS';
    const period = payload.period || currentMonthKey();
    let rule = db.master.prepare("SELECT * FROM franchise_fee_rules WHERE branch_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1").get(branchId);
    if (!rule) {
      const ruleId = `FFR-${branchId}`;
      db.master.prepare(`
        INSERT OR IGNORE INTO franchise_fee_rules (
          id, branch_id, fee_type, revenue_percent, fixed_monthly_amount,
          payment_due_day, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(ruleId, branchId, 'REVENUE_PERCENT', Number(payload.revenuePercent ?? 0.03), 0, Number(payload.paymentDueDay ?? 10), 1, createdAt);
      rule = db.master.prepare("SELECT * FROM franchise_fee_rules WHERE id = ?").get(ruleId);
    }
    const metric = getFranchiseCenterData({ branchId }).branchMetrics.find((row) => row.branchId === branchId) || { totalRevenue: 0 };
    const branchRevenue = Number(payload.branchRevenue ?? metric.totalRevenue ?? 0);
    const calculatedFee = calculateFranchiseFee({ rule, branchRevenue });
    const recordId = payload.recordId || `FFREC-${branchId}-${period}`;
    db.master.prepare(`
      INSERT OR REPLACE INTO franchise_fee_records (
        id, branch_id, period, branch_revenue, calculated_fee,
        paid_amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM franchise_fee_records WHERE id = ?), ?))
    `).run(recordId, branchId, period, branchRevenue, calculatedFee, Number(payload.paidAmount || 0), Number(payload.paidAmount || 0) >= calculatedFee ? 'PAID' : 'PENDING', recordId, createdAt);
    return { recordId, feeRecord: db.master.prepare("SELECT * FROM franchise_fee_records WHERE id = ?").get(recordId), franchiseData: getFranchiseCenterData({ branchId }) };
  }

  function markFranchiseFeePaid(payload = {}) {
    const recordId = payload.recordId || payload.id;
    const paidAmount = Number(payload.paidAmount || payload.paid_amount || 0);
    db.master.prepare(`
      UPDATE franchise_fee_records
      SET paid_amount = ?, status = CASE WHEN ? >= calculated_fee THEN 'PAID' ELSE 'PENDING' END
      WHERE id = ?
    `).run(paidAmount, paidAmount, recordId);
    return { recordId, feeRecord: db.master.prepare("SELECT * FROM franchise_fee_records WHERE id = ?").get(recordId), franchiseData: getFranchiseCenterData() };
  }

  function createFranchiseReplicationTemplate(payload = {}) {
    ensureHeadquartersBranch();
    const createdAt = payload.createdAt || nowIso();
    const templateId = payload.templateId || `FRT-${Date.now()}`;
    const templatePayload = payload.payload || {
      masterData: getMasterDataCenterData({ runValidation: false }).summary,
      pceRules: getBranchProfitPolicy('HEADQUARTERS'),
      documentTemplates: db.project.prepare("SELECT * FROM contract_documents ORDER BY created_at DESC LIMIT 20").all(),
      communicationTemplates: db.project.prepare("SELECT * FROM communication_templates ORDER BY created_at DESC LIMIT 50").all(),
      boardTemplates: db.project.prepare("SELECT * FROM design_board_templates ORDER BY created_at DESC LIMIT 20").all(),
      visualizationPresets: db.project.prepare("SELECT * FROM comfyui_workflow_presets ORDER BY created_at DESC LIMIT 20").all(),
      dashboardSettings: { entry: 'estimate-first', controlTower: true }
    };
    db.master.prepare(`
      INSERT OR REPLACE INTO franchise_replication_templates (
        id, template_name, version, payload_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM franchise_replication_templates WHERE id = ?), ?))
    `).run(templateId, payload.templateName || payload.template_name || '신규 지점 표준 복제 템플릿', payload.version || '1.0.0', toJson(templatePayload), payload.status || 'ACTIVE', templateId, createdAt);
    return { templateId, template: db.master.prepare("SELECT * FROM franchise_replication_templates WHERE id = ?").get(templateId), franchiseData: getFranchiseCenterData() };
  }

  function applyReplicationTemplateToBranch(payload = {}) {
    const branchId = payload.branchId || payload.branch_id;
    const templateId = payload.templateId || payload.template_id;
    const template = db.master.prepare("SELECT * FROM franchise_replication_templates WHERE id = ?").get(templateId);
    const branch = db.master.prepare("SELECT * FROM franchise_branches WHERE id = ?").get(branchId);
    if (!branch) throw new Error(`Branch not found: ${branchId}`);
    if (!template) throw new Error(`Replication template not found: ${templateId}`);
    const published = publishFranchiseDistributionPackage({
      packageName: `${branch.branch_name} 복제 템플릿 적용`,
      packageType: 'REPLICATION_TEMPLATE',
      version: template.version,
      payload: fromJson(template.payload_json, {}),
      status: 'PUBLISHED'
    });
    const applied = applyFranchisePackageToBranch({ branchId, packageId: published.packageId });
    return { templateId, branchId, packageId: published.packageId, applied, franchiseData: getFranchiseCenterData({ branchId }) };
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
      kitchenEstimateCount: countRows(db.project, 'kitchen_estimates'),
      kitchenEstimateItemCount: countRows(db.project, 'kitchen_estimate_items'),
      fullRemodelingEstimateCount: countRows(db.project, 'full_remodeling_estimates'),
      fullRemodelingEstimateItemCount: countRows(db.project, 'full_remodeling_estimate_items'),
      floorplanCount: countRows(db.project, 'floorplans'),
      floorplanSpaceCount: countRows(db.project, 'floorplan_spaces'),
      spaceEstimateLinkCount: countRows(db.project, 'space_estimate_links'),
      designPromptOutputCount: countRows(db.project, 'design_prompt_outputs'),
      moodboardProfileCount: countRows(db.project, 'moodboard_profiles'),
      visualizationBriefCount: countRows(db.project, 'visualization_briefs'),
      visualizationJobCount: countRows(db.project, 'visualization_jobs'),
      visualizationResultCount: countRows(db.project, 'visualization_results'),
      comfyUiSettingsCount: countRows(db.project, 'comfyui_settings'),
      comfyUiWorkflowPresetCount: countRows(db.project, 'comfyui_workflow_presets'),
      comfyUiJobLogCount: countRows(db.project, 'comfyui_job_logs'),
      designBoardTemplateCount: countRows(db.project, 'design_board_templates'),
      designBoardCount: countRows(db.project, 'design_boards'),
      designBoardSectionCount: countRows(db.project, 'design_board_sections'),
      portfolioCandidateCount: countRows(db.project, 'portfolio_candidates'),
      visualizationExportDir,
      boardExportDir,
      estimateExportDir,
      contractExportDir,
      scheduleExportDir,
      purchaseOrderExportDir,
      reportExportDir,
      constructionScheduleCount: countRows(db.project, 'construction_schedules'),
      constructionScheduleItemCount: countRows(db.project, 'construction_schedule_items'),
      purchaseOrderItemCount: countRows(db.project, 'purchase_order_items'),
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
      clientPortalTokenCount: countRows(db.project, 'client_portal_tokens'),
      clientConfirmationCount: countRows(db.project, 'client_confirmations'),
      clientChangeOrderResponseCount: countRows(db.project, 'client_change_order_responses'),
      clientDefectRequestCount: countRows(db.project, 'client_defect_requests'),
      analyticsSnapshotCount: countRows(db.project, 'analytics_snapshots'),
      analyticsPredictionCount: countRows(db.project, 'analytics_predictions'),
      analyticsExportLogCount: countRows(db.project, 'analytics_export_logs'),
      aiAgentCount: countRows(db.project, 'ai_agents'),
      aiTaskQueueCount: countRows(db.project, 'ai_task_queue'),
      aiLearningLogCount: countRows(db.project, 'ai_learning_logs'),
      aiPreventionRuleCount: countRows(db.project, 'ai_prevention_rules'),
      communicationMessageCount: countRows(db.project, 'communication_messages'),
      communicationTemplateCount: countRows(db.project, 'communication_templates'),
      communicationSendLogCount: countRows(db.project, 'communication_send_logs'),
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
      dailySiteReportItemCount: countRows(db.project, 'daily_site_report_items'),
      crewAttendanceLogCount: countRows(db.project, 'crew_attendance_logs'),
      materialDeliveryCheckCount: countRows(db.project, 'material_delivery_checks'),
      materialReceivingLogCount: countRows(db.project, 'material_receiving_logs'),
      siteMediaFileCount: countRows(db.project, 'site_media_files'),
      fieldSignatureCount: countRows(db.project, 'field_signatures'),
      fieldRiskReportCount: countRows(db.project, 'field_risk_reports'),
      inspectionResultCount: countRows(db.project, 'inspection_results'),
      inspectionChecklistItemCount: countRows(db.project, 'inspection_checklist_items'),
      siteIssueCount: countRows(db.project, 'site_issues'),
      changeOrderRequestCount: countRows(db.project, 'change_order_requests'),
      changeOrderCount: countRows(db.project, 'change_orders'),
      defectReportCount: countRows(db.project, 'defect_reports'),
      ceoDecisionQueueCount: countRows(db.project, 'ceo_decision_queue'),
      approvalRequestCount: countRows(db.project, 'approval_requests'),
      redAlertEventCount: countRows(db.project, 'red_alert_events'),
      cashflowSnapshotCount: countRows(db.project, 'cashflow_snapshots'),
      customerPaymentCount: countRows(db.project, 'customer_payments'),
      vendorPaymentCount: countRows(db.project, 'vendor_payments'),
      paymentTransactionCount: countRows(db.project, 'payment_transactions'),
      paymentAlertCount: countRows(db.project, 'payment_alerts'),
      projectClosingSnapshotCount: countRows(db.project, 'project_closing_snapshots'),
      projectClosingCostLeakCount: countRows(db.project, 'project_closing_cost_leaks'),
      projectCostLeakCount: countRows(db.project, 'project_cost_leaks'),
      projectClosingReportCount: countRows(db.project, 'project_closing_reports'),
      estimateCalibrationRuleCount: countRows(db.project, 'estimate_calibration_rules'),
      projectRiskPatternCount: countRows(db.project, 'project_risk_patterns'),
      calibrationApprovalLogCount: countRows(db.project, 'calibration_approval_logs'),
      aiEstimateRecommendationCount: countRows(db.project, 'ai_estimate_recommendations'),
      aiEstimateWarningCount: countRows(db.project, 'ai_estimate_warnings'),
      aiEstimateRiskScoreCount: countRows(db.project, 'ai_estimate_risk_scores'),
      aiRecommendationActionCount: countRows(db.project, 'ai_recommendation_actions'),
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
      vendorPriceRollbackSnapshotCount: countRows(db.master, 'vendor_price_rollback_snapshots'),
      materialPriceHistoryCount: countRows(db.master, 'material_price_history'),
      vendorReliabilityScoreCount: countRows(db.master, 'vendor_reliability_scores'),
      vendorPriceAlertCount: countRows(db.master, 'vendor_price_alerts'),
      vendorPriceRecommendationCount: countRows(db.master, 'vendor_price_recommendations'),
      processMasterCount: countRows(db.master, 'process_master'),
      materialMasterCount: countRows(db.master, 'material_master'),
      vendorMasterCount: countRows(db.master, 'vendor_master'),
      laborMasterCount: countRows(db.master, 'labor_master'),
      equipmentMasterCount: countRows(db.master, 'equipment_master'),
      standardEstimateItemCount: countRows(db.master, 'standard_estimate_items'),
      masterDataValidationLogCount: countRows(db.master, 'master_data_validation_logs'),
      franchiseBranchCount: countRows(db.master, 'franchise_branches'),
      franchiseDistributionPackageCount: countRows(db.master, 'franchise_distribution_packages'),
      franchiseBranchPackageStatusCount: countRows(db.master, 'franchise_branch_package_status'),
      branchProfitPolicyCount: countRows(db.master, 'branch_profit_policies'),
      franchiseFeeRuleCount: countRows(db.master, 'franchise_fee_rules'),
      franchiseFeeRecordCount: countRows(db.master, 'franchise_fee_records'),
      franchiseRiskAlertCount: countRows(db.master, 'franchise_risk_alerts'),
      franchiseReplicationTemplateCount: countRows(db.master, 'franchise_replication_templates')
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
    importLightBIMPayload,
    importLightBIMJSONFile,
    createEstimateFromLightBIM,
    calculateBathroomEstimatePreview,
    saveBathroomEstimate,
    exportBathroomEstimateDocument,
    calculateKitchenEstimatePreview,
    saveKitchenEstimate,
    exportKitchenEstimateDocument,
    calculateFullRemodelingEstimatePreview,
    saveFullRemodelingEstimate,
    exportFullRemodelingEstimateDocument,
    getAiEstimateIntelligence,
    decideAiRecommendationAction,
    generateBathroomContract,
    exportBathroomContractPdf,
    generateBathroomSchedule,
    generateBathroomPurchaseOrder,
    generateKitchenContract,
    generateKitchenSchedule,
    generateKitchenPurchaseOrder,
    generateFullRemodelingContract,
    generateFullRemodelingSchedule,
    generateFullRemodelingPurchaseOrder,
    getFloorplanCenterData,
    saveFloorplanMetadata,
    createFloorplanSpace,
    linkEstimateItemToSpace,
    saveMoodboardProfile,
    generatePerspectivePrompt,
    getAIVisualizationCenterData,
    createVisualizationBrief,
    generateVisualizationPrompts,
    queueVisualizationJob,
    checkComfyUiHealth,
    getComfyUiSettingsData,
    saveComfyUiSettings,
    saveComfyUiWorkflowPreset,
    runComfyUiGeneration,
    refreshComfyUiJobStatus,
    attachVisualizationResult,
    decideVisualizationResult,
    getBoardGenerationCenterData,
    createDesignBoard,
    exportDesignBoardPdf,
    createPortfolioCandidate,
    getProjectExecutionReadiness,
    getFieldMobileCenterData,
    saveFieldAttendanceCheckIn,
    saveFieldAttendanceCheckOut,
    createFieldDailyReport,
    saveSiteMediaFile,
    createFieldMaterialReceiving,
    saveFieldInspectionResult,
    createFieldChangeOrderRequest,
    createFieldDefectReport,
    saveFieldSignature,
    createFieldRiskReport,
    transitionProjectToExecution,
    getSiteOperationStatus,
    startSiteOperation,
    saveDailySiteReport,
    saveMaterialDeliveryCheck,
    saveInspectionResult,
    createSiteIssue,
    createChangeOrderRequest,
    createDailySiteReportFromSchedule,
    createCrewAttendanceReport,
    createMaterialReceivingLog,
    createInspectionChecklistFromSchedule,
    saveInspectionChecklistResults,
    createExecutionChangeOrder,
    approveExecutionChangeOrder,
    createDefectReport,
    getProjectCompletionReadiness,
    completeProject,
    getActualCostCaptureDashboard,
    saveActualCostEntry,
    evaluateCostCaptureReadiness,
    getVendorPriceAdminData,
    createVendorPriceCatalogEntry,
    decideVendorPriceApproval,
    getVendorPriceIntelligenceData,
    saveMaterialPriceHistory,
    importMaterialPriceHistoryCsv,
    decideVendorPriceRecommendation,
    getVendorSelectionRecommendation,
    getMasterDataCenterData,
    createMasterDataItem,
    runMasterDataValidation,
    importMasterDataCsv,
    exportMasterDataCsv,
    getFranchiseCenterData,
    createFranchiseBranch,
    publishFranchiseDistributionPackage,
    applyFranchisePackageToBranch,
    createBranchProfitPolicy,
    calculateFranchiseFeeRecord,
    markFranchiseFeePaid,
    createFranchiseReplicationTemplate,
    applyReplicationTemplateToBranch,
    runAutomationScheduler,
    getAnalyticsCenterData,
    exportAnalyticsReport,
    getAIAutomationCenterData,
    runAIAgentAutomation,
    decideAIAgentTask,
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
    getCeoControlTowerData,
    decideCeoApprovalRequest,
    getClientContractData,
    approveContract,
    getClientPortalData,
    generateClientPortalToken,
    confirmClientContract,
    respondClientChangeOrder,
    createClientDefectRequest,
    saveClientCompletionConfirmation,
    getCommunicationCenterData,
    generateCommunicationMessage,
    markCommunicationMessageSent,
    cancelCommunicationMessage,
    getPaymentCenterData,
    markCustomerPaymentReceived,
    markVendorPaymentPaid,
    createPaymentRequestMessage,
    requestVendorPaymentApproval,
    getProjectClosingCenterData,
    createProjectClosingSnapshot,
    finalizeProjectClosing,
    saveHighMarginTemplateFromClosing,
    getProjectCalibrationCenterData,
    createProjectCalibrationSnapshot,
    decideCalibrationRule,
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
