import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

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
            MatTabsModule,
            MatSelectModule,
            MatButtonModule,
            MatFormFieldModule,
            BrowserAnimationsModule,
            HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'droplet-angular';
  // isUpdatingGraph = false;

  experiments: FullExperiment[] = [];
  selectedExperimentId: string | null = null;
  lastCapturedData: DataEntry | null = null;
  
  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}

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
          this.selectedExperimentId = experiment.id;
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Error creating experiment:', error)
      });
    }
  }

  onExperimentSelected(event: any) {
    console.log('Experiment selected:', event);
    this.selectedExperimentId = event;

    // Send id back to server
    this.http.post(`/api/experiments/select/${this.selectedExperimentId}`, {}).subscribe({
      next: (response) => {
        console.log('Experiment selection confirmed:', response);
      },
      error: (error) => console.error('There was an error!', error)
    });
  }

  captureData() {
    // Step 1: Capture the data
    this.http.post<{id: number}>('/api/data/capture', {}).subscribe({
      next: (response) => {
        console.log('Data captured:', response);
        const entryId = response.id;
  
        // Step 2: Fetch the full DataEntry details using the returned ID
        this.http.get<DataEntry>(`/api/experiments/${this.selectedExperimentId}/data/${entryId}`).subscribe({
          next: (dataEntry) => {
            this.lastCapturedData = dataEntry; // Store the full DataEntry details
            this.cdr.detectChanges(); // Trigger change detection to update the UI
          },
          error: (error) => console.error('Error fetching data entry details:', error)
        });
      },
      error: (error) => console.error('Error capturing data:', error)
    });
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
}