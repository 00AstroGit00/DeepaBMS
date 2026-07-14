{{/*
Expand the name of the chart.
*/}}
{{- define "deepa-bms.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 43 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "deepa-bms.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart name and version label.
*/}}
{{- define "deepa-bms.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "deepa-bms.labels" -}}
helm.sh/chart: {{ include "deepa-bms.chart" . }}
{{ include "deepa-bms.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: deepa-bms
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "deepa-bms.selectorLabels" -}}
app.kubernetes.io/name: {{ include "deepa-bms.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Component-specific selector labels.
*/}}
{{- define "deepa-bms.selectorLabelsFor" -}}
app.kubernetes.io/name: {{ include "deepa-bms.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Name for a given component.
*/}}
{{- define "deepa-bms.componentName" -}}
{{- printf "%s-%s" (include "deepa-bms.fullname" .) .component }}
{{- end }}
