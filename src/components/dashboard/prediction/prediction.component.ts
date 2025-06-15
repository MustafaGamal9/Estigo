import { Component, OnInit, OnDestroy, AfterViewChecked, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin, of, Observable, ObservableInput } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

declare var CanvasJS: any;

// Interfaces (UserData, PredictionData, PredictionResult)
// remain the same as you provided. I'll omit them here for brevity but assume they are present.
interface UserData {
  id: string;
  email: string;
  name: string;
  role: string; // "Student" or "Teacher" or "Parent"
}
interface PredictionData {
  attendance_rate: number;
  average_quiz_score: number;
  quizzes_completion_rate: number;
  final_exam_attempts: number;
  final_exam_score: number;
  education_system_IGCSE: number;
}
interface PredictionResult {
  predicted_grade: string;
}


@Component({
  selector: 'app-prediction',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './prediction.component.html', // Make sure this path is correct
  styleUrls: ['./prediction.component.css']   // Make sure this path is correct
})
export class PredictionComponent implements OnInit, OnDestroy, AfterViewChecked {

  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private cdRef = inject(ChangeDetectorRef);

  categoryId: number = 1; // Default, will be overridden by route param
  targetStudentId: string | null = null;
  targetStudentName: string | null = null; // Usually for display if fetched

  predictionData: PredictionData | null = null;
  predictedGrade: string | null = null;
  educationSystem: string = '';

  isLoading: boolean = true;
  error: string | null = null;
  loggedInUser: UserData | null = null;

  private subscriptions: Subscription = new Subscription();
  private charts: any[] = [];
  private shouldRenderCharts = false;

  private readonly localStorageUserKey = 'userData'; // Consistent key for user data

  ngOnInit(): void {
    console.log('[PredictionComponent] ngOnInit started.');
    this.loadLoggedInUser();

    if (!this.loggedInUser) {
      this.error = "User data not found. Please log in to view predictions.";
      this.isLoading = false;
      console.warn('[PredictionComponent] LoggedInUser not found. Exiting ngOnInit early.');
      return;
    }
    console.log('[PredictionComponent] LoggedInUser:', this.loggedInUser);

    const routeParamsSub = this.route.paramMap.pipe(
      tap((params: ParamMap) => {
        console.log('[PredictionComponent] Route params received:', params.keys);
        this.clearPreviousState();
        this.isLoading = true;
        this.error = null;

        // Get categoryId from route - THIS IS THE CRUCIAL PART FOR STUDENT'S OWN PREDICTION
        const categoryParam = params.get('categoryId');
        if (categoryParam) {
          this.categoryId = parseInt(categoryParam, 10);
          console.log(`[PredictionComponent] Category ID from route: ${this.categoryId}`);
        } else {
          // Fallback or error if categoryId is somehow missing from a route that should have it
          // For 'predict/:categoryId', it should always be present.
          // For 'student-prediction/:studentId/:categoryId', it should also be present.
          console.warn('[PredictionComponent] categoryId not found in route params. Using default or previous:', this.categoryId);
          // You might want to set an error here if categoryId is mandatory for the current context
          // this.error = "Category ID is missing in the request.";
          // this.isLoading = false;
        }


        // Determine targetStudentId
        // Check if studentId is passed in the route (for Teacher/Parent viewing specific student)
        const studentIdFromRoute = params.get('studentId');
        if (studentIdFromRoute && (this.loggedInUser?.role === 'Teacher' || this.loggedInUser?.role === 'Parent')) {
          this.targetStudentId = studentIdFromRoute;
          console.log(`[PredictionComponent] Target Student ID (from route for Teacher/Parent): ${this.targetStudentId}`);
          // Optionally fetch student name if needed for display for teachers
          // this.targetStudentName = ... (requires another API call or data passed in route state)
        } else if (this.loggedInUser?.role === 'Student') {
          this.targetStudentId = this.loggedInUser.id;
          this.targetStudentName = this.loggedInUser.name;
          console.log(`[PredictionComponent] Target Student ID (Logged-in Student): ${this.targetStudentId}`);
        } else if (this.loggedInUser?.role === 'Teacher' || this.loggedInUser?.role === 'Parent') {
            // Teacher/Parent route but studentId not in params (e.g. if they navigated to /predict/:categoryId directly)
            this.error = "Teachers/Parents must select a specific student via the correct link (e.g., /student-prediction/...).";
            this.isLoading = false;
            this.targetStudentId = null;
            console.warn('[PredictionComponent] Teacher/Parent role, but no studentId in route for a student-specific view.');
        }
         else {
          this.error = "Unable to determine student for predictions. User role or context unclear.";
          this.isLoading = false;
          this.targetStudentId = null;
          console.warn('[PredictionComponent] Could not determine targetStudentId.');
        }
      }),
      switchMap((): ObservableInput<[PredictionData | null, PredictionResult | null] | null> => {
        if (this.targetStudentId && this.categoryId && this.isLoading) { // Ensure isLoading is still true (no error in tap)
          console.log(`[PredictionComponent] Proceeding to fetchPredictionDetails for studentId: ${this.targetStudentId}, categoryId: ${this.categoryId}`);
          return this.fetchPredictionDetails();
        } else {
          console.warn('[PredictionComponent] Skipping fetchPredictionDetails. TargetStudentId:', this.targetStudentId, 'CategoryId:', this.categoryId, 'IsLoading:', this.isLoading);
          if (!this.error && !this.targetStudentId) {
              this.error = "Student context is missing. Cannot load predictions.";
          } else if (!this.error && !this.categoryId) {
              this.error = "Category is missing. Cannot load predictions.";
          }
          // If isLoading is false, an error was likely set in tap.
          this.isLoading = false; // Ensure loading stops if we skip fetch
          return of(null);
        }
      })
    ).subscribe({
      next: (apiResult) => {
        console.log('[PredictionComponent] API Result received in subscribe:', apiResult);
        if (apiResult === null) {
            if (!this.error) {
                this.error = "Failed to retrieve prediction details.";
            }
            this.isLoading = false;
            console.warn('[PredictionComponent] apiResult is null. Current error state:', this.error);
            return;
        }

        const [data, result] = apiResult;
        console.log('[PredictionComponent] Destructured API data (/model-values):', data);
        console.log('[PredictionComponent] Destructured API result (/model-result):', result);
        let errorsAccumulator: string[] = [];

        if (data) {
          this.predictionData = data;
          this.educationSystem = data.education_system_IGCSE === 1 ? 'IGCSE' : 'EST';
          this.shouldRenderCharts = true;
          console.log('[PredictionComponent] PredictionData processed:', this.predictionData);
        } else {
          errorsAccumulator.push('Failed to fetch performance metrics (/model-values).');
          this.shouldRenderCharts = false;
          console.warn('[PredictionComponent] Performance metrics (data from /model-values) is null.');
        }

        if (result) {
          this.predictedGrade = result.predicted_grade;
          console.log('[PredictionComponent] PredictedGrade processed:', this.predictedGrade);
        } else {
          errorsAccumulator.push('Failed to fetch predicted grade (/model-result).');
          this.predictedGrade = null;
          console.warn('[PredictionComponent] Predicted grade (result from /model-result) is null.');
        }

        if (errorsAccumulator.length > 0) {
          this.error = errorsAccumulator.join(' ');
          if (!data && !result) this.predictionData = null;
          console.warn('[PredictionComponent] Errors accumulated:', this.error);
        }
        this.isLoading = false;
        console.log('[PredictionComponent] Final state before rendering: isLoading:', this.isLoading, 'error:', this.error, 'predictionData:', !!this.predictionData, 'shouldRenderCharts:', this.shouldRenderCharts);
      },
      error: (err: HttpErrorResponse | Error) => {
        console.error("[PredictionComponent] Critical error in prediction data pipeline:", err);
        let message = (err instanceof Error) ? err.message : 'Unknown error';
        this.error = `An unexpected error occurred: ${message}`;
        if (err instanceof HttpErrorResponse) {
            this.error += ` (Status: ${err.status})`;
        }
        this.isLoading = false;
        this.predictionData = null;
        this.predictedGrade = null;
        this.shouldRenderCharts = false;
      }
    });
    this.subscriptions.add(routeParamsSub);
  }

  ngAfterViewChecked(): void {
    if (this.shouldRenderCharts && this.predictionData && !this.isLoading && typeof CanvasJS !== 'undefined' && CanvasJS.Chart) {
      console.log('[PredictionComponent] ngAfterViewChecked: Rendering charts.');
      this.renderCharts();
      this.shouldRenderCharts = false;
      this.cdRef.detectChanges();
    }
  }

  ngOnDestroy(): void {
    console.log('[PredictionComponent] ngOnDestroy called.');
    this.subscriptions.unsubscribe();
    this.destroyCharts();
  }

  private clearPreviousState(): void {
    console.log('[PredictionComponent] Clearing previous state.');
    this.predictionData = null;
    this.predictedGrade = null;
    this.educationSystem = '';
    // this.error = null; // Error is cleared at the start of the tap operator in ngOnInit
    // this.isLoading = true; // isLoading is set at the start of the tap operator in ngOnInit
    this.shouldRenderCharts = false;
    this.destroyCharts();
  }

  private loadLoggedInUser(): void {
    const userDataString = localStorage.getItem(this.localStorageUserKey);
    if (userDataString) {
      try {
        this.loggedInUser = JSON.parse(userDataString) as UserData;
       
      } catch (e) {
        console.error('[PredictionComponent] Error parsing user data from localStorage:', e);
        this.loggedInUser = null;
      }
    } else {
        console.warn('[PredictionComponent] No user data found in localStorage.');
        this.loggedInUser = null;
    }
  }

  private fetchPredictionDetails(): Observable<[PredictionData | null, PredictionResult | null]> {
    if (!this.targetStudentId || !this.categoryId) { // Ensure categoryId is also checked
        console.error('[PredictionComponent] fetchPredictionDetails called with invalid studentId or categoryId.',
                      'Student ID:', this.targetStudentId, 'Category ID:', this.categoryId);
        return of([null, null] as [PredictionData | null, PredictionResult | null]);
    }


    const apiBaseUrl = 'https://estigo.runasp.net'; // OR 'https://estigo.runasp.net' - REPLACE WITH YOUR ACTUAL API URL
    
    const dataUrl = `${apiBaseUrl}/api/Prediction/model-values/${this.targetStudentId}/${this.categoryId}`;
    const resultUrl = `${apiBaseUrl}/api/Prediction/model-result/${this.targetStudentId}/${this.categoryId}`;

    console.log(`[PredictionComponent] Fetching model-values from: ${dataUrl}`);
    const predictionData$ = this.http.get<PredictionData>(dataUrl).pipe(
      tap(response => console.log('[PredictionComponent] Raw response from /model-values:', response)),
      catchError((err: HttpErrorResponse) => {
        console.error(`[PredictionComponent] API Error fetching Prediction Data from ${dataUrl}:`, err.message, 'Status:', err.status, 'Response:', err.error);
        return of(null);
      })
    );

    console.log(`[PredictionComponent] Fetching model-result from: ${resultUrl}`);
    const predictionResult$ = this.http.get<PredictionResult>(resultUrl).pipe(
      tap(response => console.log('[PredictionComponent] Raw response from /model-result:', response)),
      catchError((err: HttpErrorResponse) => {
        console.error(`[PredictionComponent] API Error fetching Prediction Result from ${resultUrl}:`, err.message, 'Status:', err.status, 'Response:', err.error);
        return of(null);
      })
    );

    return forkJoin([predictionData$, predictionResult$]).pipe(
      catchError((forkJoinError: any) => {
        console.error('[PredictionComponent] Unexpected error in forkJoin for prediction details:', forkJoinError);
        return of([null, null] as [PredictionData | null, PredictionResult | null]);
      })
    );
  }

  // --- Chart rendering methods (createChart, createAttendanceChart, etc.) ---
  // These remain largely the same as your previous version with logging.
  // I'll include them for completeness.

  private renderCharts(): void {
    this.destroyCharts();

    if (this.predictionData && typeof CanvasJS !== 'undefined' && CanvasJS.Chart) {
      console.log('[PredictionComponent] renderCharts: Creating charts with data:', this.predictionData);
      this.createAttendanceChart('chartContainer1', this.predictionData.attendance_rate);
      this.createAvgQuizScoreChart('chartContainer2', this.predictionData.average_quiz_score);
      this.createCompletionRateChart('chartContainer3', this.predictionData.quizzes_completion_rate);
    } else if (!this.predictionData) {
        console.warn("[PredictionComponent] RenderCharts called but predictionData is null.");
    } else if (typeof CanvasJS === 'undefined' || !CanvasJS.Chart) {
        console.error("[PredictionComponent] CanvasJS or CanvasJS.Chart is not available for rendering charts.");
        const chartErrorMsg = "Chart library failed to load.";
        this.error = this.error ? `${this.error} ${chartErrorMsg}` : chartErrorMsg;
    }
  }

  private createChart(containerId: string, options: any): any {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      console.error(`[PredictionComponent] Chart container with ID '${containerId}' not found.`);
      const chartErrorMsg = `Chart container '${containerId}' missing.`;
      this.error = this.error ? `${this.error} ${chartErrorMsg}` : chartErrorMsg;
      return null;
    }
    if (typeof CanvasJS === 'undefined' || !CanvasJS.Chart) {
        console.error("[PredictionComponent] CanvasJS or CanvasJS.Chart is not available for chart creation.");
        containerElement.innerHTML = '<p style="color: red;">Chart library not loaded.</p>';
        return null;
    }

    try {
      console.log(`[PredictionComponent] Creating chart for container ${containerId}`); // Removed options from log for brevity
      const chart = new CanvasJS.Chart(containerId, options);
      chart.render();
      this.charts.push(chart);
      return chart;
    } catch (e) {
      console.error(`[PredictionComponent] Error rendering chart in container '${containerId}':`, e);
      const chartErrorMsg = `Failed to render chart: ${options?.title?.text || containerId}.`;
      this.error = this.error ? `${this.error} ${chartErrorMsg}` : chartErrorMsg;
      if (containerElement) containerElement.innerHTML = '<p style="color: red;">Chart failed to load.</p>';
      return null;
    }
  }

  private createAttendanceChart(containerId: string, rate: number): void {
    if (rate === undefined || rate === null) { console.warn(`[PredictionComponent] Attendance rate data missing for chart ${containerId}`); return; }
    this.createChart(containerId, {
      theme: "light2", exportEnabled: false, animationEnabled: true,
      title: { text: `Attendance Rate` },
      data: [{
        type: "pie", startAngle: 25, toolTipContent: "<b>{label}</b>: {y}%",
        showInLegend: true, legendText: "{label}", indexLabelFontSize: 16, indexLabel: "{label} - {y}%",
        dataPoints: [ { y: rate, label: "Attended" }, { y: 100 - rate, label: "Absent" } ]
      }]
    });
  }

  private createAvgQuizScoreChart(containerId: string, score: number): void {
    if (score === undefined || score === null) { console.warn(`[PredictionComponent] Average quiz score data missing for chart ${containerId}`); return; }
    this.createChart(containerId, {
      theme: "light2", exportEnabled: false, animationEnabled: true,
      title: { text: `Average Quiz Score` },
      data: [{
        type: "pie", startAngle: 25, toolTipContent: "<b>{label}</b>: {y}%",
        showInLegend: true, legendText: "{label}", indexLabelFontSize: 16, indexLabel: "{label} - {y}%",
        dataPoints: [ { y: score, label: "Score Achieved" }, { y: 100 - score, label: "Possible Improvement" }]
      }]
    });
  }

  private createCompletionRateChart(containerId: string, rate: number): void {
    if (rate === undefined || rate === null) { console.warn(`[PredictionComponent] Quiz completion rate data missing for chart ${containerId}`); return; }
    this.createChart(containerId, {
      theme: "light2", exportEnabled: false, animationEnabled: true,
      title: { text: `Quizzes Completion Rate` },
      data: [{
        type: "pie", startAngle: 25, toolTipContent: "<b>{label}</b>: {y}%",
        showInLegend: true, legendText: "{label}", indexLabelFontSize: 16, indexLabel: "{label} - {y}%",
        dataPoints: [ { y: rate, label: "Completed" }, { y: 100 - rate, label: "Not Completed" }]
      }]
    });
  }

  private destroyCharts(): void {
    if (this.charts.length > 0) console.log('[PredictionComponent] Destroying charts.');
    this.charts.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        try {
          chart.destroy();
        } catch (e) {
          console.warn("[PredictionComponent] Error destroying chart:", e);
          if (chart.container && chart.container.id) {
            const el = document.getElementById(chart.container.id);
            if (el) el.innerHTML = '';
          }
        }
      }
    });
    this.charts = [];
  }
}