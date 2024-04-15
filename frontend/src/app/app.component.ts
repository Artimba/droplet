import { 
  Component, 
  AfterViewInit, 
  ChangeDetectorRef, 
  Inject, 
  OnDestroy 
} from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MatDialogActions,
  MatDialogClose,
  MatDialogTitle,
  MatDialogContent,
} from '@angular/material/dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

interface Experiment {
  id: string;
  name: string;
  description: string;
}

interface DataEntry {
  id: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  experiment_id: string;
  image_filename: string;
}

interface FullExperiment extends Experiment {
  data_entries?: DataEntry[];
}

// Import plotly.js
declare var Plotly: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, 
            CommonModule,
            MatTabsModule,
            MatSelectModule,
            MatButtonModule,
            MatFormFieldModule,
            BrowserAnimationsModule,
            HttpClientModule,
            MatGridListModule,
            MatMenuModule,
            MatIconModule,
            MatSliderModule,
            FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'droplet-angular';
  // isUpdatingGraph = false;

  experiments: FullExperiment[] = [];
  selectedExperimentId: string | null = null;
  lastCapturedData: DataEntry | null = null;
  captureActive = false;
  captureInterval: number = 0;

  private captureTimer: any = null;
  
  constructor(public dialog: MatDialog, private cdr: ChangeDetectorRef, private http: HttpClient) {}

  formatLabel(value: number): string {
    if (value >= 1000) {
      return Math.round(value / 1000) + 'k';
    }

    if (value === 0) {
      return 'Instant';
    }

    return `${value}`;
  }

  toggleCapture() {
    this.captureActive = !this.captureActive;
    if (this.captureActive) {
      this.startCapture();
    } else {
      this.stopCapture();
    }
  }

  startCapture() {
    // Start capturing immediately if the interval is set to instant, otherwise set up an interval
    if (this.captureInterval === 0) {
      this.captureData(); // Single capture if it's instant
    } else {
      this.captureTimer = setInterval(() => this.captureData(), this.captureInterval * 1000);
    }
  }
  

  captureData() {
    this.http.post<{id: number}>('/api/data/capture', {}).subscribe({
      next: (response) => {
        console.log('Data captured:', response);
        const entryId = response.id;
        this.http.get<DataEntry>(`/api/experiments/${this.selectedExperimentId}/data/${entryId}`).subscribe({
          next: (dataEntry) => {
            const experiment = this.experiments.find(ex => ex.id === this.selectedExperimentId);
            if (experiment && experiment.data_entries) {
              experiment.data_entries.unshift(dataEntry);
              this.lastCapturedData = dataEntry;
              this.cdr.detectChanges();
            }
          },
          error: (error) => console.error('Error fetching data entry details:', error)
        });
      },
      error: (error) => console.error('Error capturing data:', error)
    });
  
    // Automatically stop the capture if it is set to instant
    if (this.captureInterval === 0) {
      this.stopCapture();
    }
  }

  stopCapture() {
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
      this.captureActive = false;
    }
  }

  ngOnDestroy(): void {
    this.stopCapture();
  }

  fetchExperiments() {
    this.http.get<FullExperiment[]>('/api/experiments').subscribe({
      next: (experiments) => {
        this.experiments = experiments;
        this.cdr.detectChanges();
      },
      error: (error) => console.error('There was an error!', error)
    });
  }

  ngOnInit() {
    this.fetchExperiments();
  }

  ensureElement(id: string, callback: () => void) {
    const el = document.getElementById(id);
    if (el) {
      callback();
    } else {
      setTimeout(() => this.ensureElement(id, callback), 100); // Retry after 100ms
    }
  }

  ngAfterViewInit() {
    this.ensureElement('temperatureGraph', () => {
      this.initGraphs();
      // setTimeout(() => this.updateGraph(), 1000); // Update graph after 1s (to avoid race)
    });
  }

  addNewExperiment() {
    const name = prompt('Enter new experiment name:');
    const description = prompt('Enter experiment description:'); // Optional: collect a description
    
    if (name) {
      this.http.post<Experiment>('/api/experiments', { name, description: description || '' }).subscribe({
        next: (experiment) => {
          this.experiments.push(experiment);
          this.onExperimentSelected(experiment.id);
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Error creating experiment:', error)
      });
    }
  }

  onExperimentSelected(event: any) {
    console.log('Experiment selected:', event);
    this.selectedExperimentId = event;
    
    // Fetch all data entries for the selected experiment
    const selectedExperiment = this.experiments.find(ex => ex.id === this.selectedExperimentId);
    if (selectedExperiment) {
      selectedExperiment.data_entries = selectedExperiment.data_entries;
      this.cdr.detectChanges();
    }
    // Notify backend about the selected experiment
    this.http.post(`/api/experiments/select/${this.selectedExperimentId}`, {}).subscribe({
      next: (response) => {
        console.log('Experiment selection confirmed:', response);
      },
      error: (error) => console.error('There was an error!', error)
    });
  }

  get selectedExperimentDataEntries() {
    return this.experiments.find(ex => ex.id === this.selectedExperimentId)?.data_entries;
  }
  
  exportExperiment() {
    this.http.get(`/api/experiments/${this.selectedExperimentId}/export`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Experiment_${this.selectedExperimentId}.zip`;  // Set the filename here
        document.body.appendChild(a);
        a.click();  // Start the download
        window.URL.revokeObjectURL(url);  // Clean up after download
        a.remove();  // Remove the temporary link
      },
      error: (error) => console.error('Error exporting experiment:', error)
    });
  }

  deleteExperiment() {
    if (confirm('Are you sure you want to delete this experiment?')) {
      this.http.delete(`/api/experiments/${this.selectedExperimentId}`).subscribe({
        next: (response) => {
          console.log('Experiment deleted:', response);
          this.fetchExperiments();
          this.selectedExperimentId = null;
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Error deleting experiment:', error)
      });
    }
  }

  initGraphs() {
    const layoutTemperature = {
      title: 'Temperature',
      xaxis: { title: 'Time' },
      yaxis: { title: 'Temperature (°C)' }
    };

    const layoutHumidity = {
      title: 'Relative Humidity',
      xaxis: { title: 'Time' },
      yaxis: { title: 'Humidity (%)' }
    };

    const config = { responsive: true };

    const dataTemperature = [{
      x: [],
      y: [],
      mode: 'lines+markers',
      name: 'Temperature',
      type: 'scatter'
    }];

    const dataHumidity = [{
      x: [],
      y: [],
      mode: 'lines+markers',
      name: 'Humidity',
      type: 'scatter'
    }];

    Plotly.newPlot('temperatureGraph', dataTemperature, layoutTemperature, config);
    Plotly.newPlot('humidityGraph', dataHumidity, layoutHumidity, config);
  }
  
  updateGraph() {
    if (!document.getElementById('temperatureGraph') || !document.getElementById('humidityGraph')) {
      console.log('Graph elements not found, skipping update.');
      return;
    }
    fetch('/api/data')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const currentTime = new Date().toISOString();
        // Query the current tab to ensure graphs are still visible.
        const currentTab = document.querySelector('.mdc-tab--active');
        if (currentTab == null || currentTab.textContent?.trim() !== 'Live Sensor View') {
          return;
        }
        console.log('Updating graph with data:', data)
        // Update temperature graph
        Plotly.extendTraces('temperatureGraph', {
          x: [[currentTime]],
          y: [[data.temperature]]
        }, [0]);

        // Update humidity graph
        Plotly.extendTraces('humidityGraph', {
          x: [[currentTime]],
          y: [[data.humidity]]
        }, [0]);

        setTimeout(() => this.updateGraph(), 1000); // Update graph every second
      })
  }

  onTabChanged(event: any) {
    if (event.index == 1) {
      console.log("Tab changed to: " + event.index);
      this.updateGraph();
    }
  }

  openModal(dataEntry: DataEntry) {
    console.log('Opening modal with data:', dataEntry)
    let dialogRef = this.dialog.open(DataEntryDetailDialog, {
      data: { 
        entry: dataEntry,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
}

@Component({
  selector: 'data-entry-detail-dialog',
  templateUrl: 'data-entry-detail-dialog.html',
  styleUrls: ['./data-entry-detail-dialog.scss'],
  standalone: true,
  imports: [CommonModule,
            DatePipe, 
            MatButtonModule, 
            MatDialogActions, 
            MatDialogClose, 
            MatDialogTitle, 
            MatDialogContent],
})
export class DataEntryDetailDialog {
  // This doesn't work. Works in Stackblitz, but not here. Tried Input() and services, but no luck.
  // After 4 hours of trying to literally just send data to a dialog, I'm giving up.
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { entry: DataEntry }) {
    console.log('Data received in dialog:', data)  }
}