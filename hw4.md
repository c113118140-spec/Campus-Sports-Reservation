
# 作業四：UML 系統設計

## 一、專題名稱

校園運動場地預約系統  
(Campus Sports Facility Reservation System)

## 二、系統設計說明

本專題依據作業三的需求分析與使用案例，
進行 UML 系統設計。

設計內容包含：
1. UML 類別圖（Class Diagram）
2. 三個使用案例的循序圖（Sequence Diagram）
3. 三個使用案例的活動圖（Activity Diagram）

本次選擇以下三個主要使用案例：
- UC-01：查詢場地
- UC-02：預約場地
- UC-03：取消預約

## 三、UML 類別圖（Class Diagram）

類別圖用來描述系統中的主要類別、
類別屬性、方法及彼此之間的關係。

```mermaid
classDiagram
    class User {
        +int userId
        +String name
        +String account
        -String passwordHash
        +login()
    }

    class Student {
        +searchFacility()
        +createReservation()
        +cancelReservation()
        +viewReservations()
    }

    class Admin {
        +addFacility()
        +updateFacility()
        +setAvailableTime()
        +viewFacilityReservations()
    }

    class Facility {
        +int facilityId
        +String facilityName
        +String facilityType
        +String location
        +getFacilityInfo()
    }

    class TimeSlot {
        +int slotId
        +Date date
        +String startTime
        +String endTime
        +Boolean isAvailable
        +checkAvailability()
    }

    class Reservation {
        +int reservationId
        +String status
        +Date createdAt
        +create()
        +cancel()
    }

    User <|-- Student
    User <|-- Admin

    Admin "1" --> "0..*" Facility : manages
    Facility "1" --> "0..*" TimeSlot : contains
    Student "1" --> "0..*" Reservation : makes
    TimeSlot "1" --> "0..*" Reservation : records
```

### 類別說明

| 類別 | 功能說明 |
|---|---|
| User | 儲存使用者基本資料及登入功能 |
| Student | 提供學生查詢、預約及取消功能 |
| Admin | 提供管理員管理場地的功能 |
| Facility | 儲存運動場地的基本資訊 |
| TimeSlot | 儲存各場地的日期與時段 |
| Reservation | 儲存預約紀錄及預約狀態 |

### 類別關係

1. Student 和 Admin 繼承 User。
2. Admin 可以管理多個 Facility。
3. Facility 可以包含多個 TimeSlot。
4. Student 可以建立多筆 Reservation。
5. 每筆 Reservation 對應一個 TimeSlot。

系統會檢查有效預約紀錄，
避免相同場地與時段被重複預約。

## 四、循序圖（Sequence Diagram）

循序圖用來表示使用者、系統介面、
系統服務及資料庫之間的互動順序。

### 4.1 UC-01 查詢場地循序圖

```mermaid
sequenceDiagram
    actor Student as 學生
    participant UI as 系統介面
    participant FS as 場地服務
    participant DB as 資料庫

    Student->>UI: 選擇查詢場地
    UI-->>Student: 顯示查詢頁面
    Student->>UI: 輸入場地類型、日期、時段
    UI->>FS: 傳送查詢條件
    FS->>DB: 查詢場地及可預約時段
    DB-->>FS: 回傳查詢結果
    FS-->>UI: 回傳場地資訊

    alt 有符合條件的場地
        UI-->>Student: 顯示場地及預約狀態
    else 沒有符合條件的場地
        UI-->>Student: 顯示查無符合條件的場地
    end
```

### 4.2 UC-02 預約場地循序圖

```mermaid
sequenceDiagram
    actor Student as 學生
    participant UI as 系統介面
    participant RS as 預約服務
    participant DB as 資料庫

    Student->>UI: 選擇場地、日期及時段
    UI->>RS: 查詢時段是否可預約
    RS->>DB: 檢查時段及預約紀錄
    DB-->>RS: 回傳檢查結果

    alt 時段可預約
        RS-->>UI: 回傳可預約
        UI-->>Student: 顯示預約確認資訊
        Student->>UI: 確認預約
        UI->>RS: 提交預約請求
        RS->>DB: 再次檢查並建立預約

        alt 建立成功
            DB-->>RS: 回傳預約成功
            RS-->>UI: 回傳預約結果
            UI-->>Student: 顯示預約成功
        else 時段衝突或儲存失敗
            DB-->>RS: 回傳失敗原因
            RS-->>UI: 回傳預約失敗
            UI-->>Student: 顯示失敗訊息
        end
    else 時段不可預約
        RS-->>UI: 回傳不可預約
        UI-->>Student: 提示重新選擇時段
    end
```

### 4.3 UC-03 取消預約循序圖

```mermaid
sequenceDiagram
    actor Student as 學生
    participant UI as 系統介面
    participant RS as 預約服務
    participant DB as 資料庫

    Student->>UI: 查看個人預約紀錄
    UI->>RS: 查詢個人預約
    RS->>DB: 取得預約資料
    DB-->>RS: 回傳預約紀錄
    RS-->>UI: 回傳預約清單
    UI-->>Student: 顯示預約紀錄

    Student->>UI: 選擇取消預約
    UI->>RS: 檢查取消資格
    RS->>DB: 查詢預約狀態及時間
    DB-->>RS: 回傳檢查結果

    alt 預約尚未開始且有效
        RS-->>UI: 允許取消
        UI-->>Student: 顯示取消確認
        Student->>UI: 確認取消
        UI->>RS: 提交取消請求
        RS->>DB: 更新預約狀態為已取消
        DB-->>RS: 回傳更新結果
        RS-->>UI: 回傳取消成功
        UI-->>Student: 顯示取消成功
    else 不符合取消條件
        RS-->>UI: 回傳不可取消
        UI-->>Student: 顯示無法取消原因
    end
```

## 五、活動圖（Activity Diagram）

活動圖用來表示各功能的操作流程、
執行步驟及條件判斷。

### 5.1 UC-01 查詢場地活動圖

```mermaid
flowchart TD
    A([開始])
    B[學生進入場地查詢頁面]
    C[選擇場地類型、日期及時段]
    D[系統查詢場地資料]
    E{有符合條件的場地嗎}
    F[顯示場地資訊及可預約狀態]
    G[顯示查無符合條件的場地]
    H([結束])

    A --> B
    B --> C
    C --> D
    D --> E
    E -->|是| F
    E -->|否| G
    F --> H
    G --> H
```

### 5.2 UC-02 預約場地活動圖

```mermaid
flowchart TD
    A([開始])
    B[學生選擇場地]
    C[選擇預約日期及時段]
    D[系統檢查時段]
    E{時段可預約嗎}
    F[顯示預約確認資訊]
    G{學生確認預約嗎}
    H[系統再次檢查並建立預約]
    I{建立預約成功嗎}
    J[顯示預約成功]
    K[提示時段不可用或建立失敗]
    L([結束])

    A --> B
    B --> C
    C --> D
    D --> E
    E -->|是| F
    E -->|否| K
    F --> G
    G -->|是| H
    G -->|否| L
    H --> I
    I -->|是| J
    I -->|否| K
    J --> L
    K --> L
```

### 5.3 UC-03 取消預約活動圖

```mermaid
flowchart TD
    A([開始])
    B[學生查看個人預約紀錄]
    C[選擇要取消的預約]
    D[系統檢查預約狀態及時間]
    E{符合取消條件嗎}
    F[顯示取消確認訊息]
    G{學生確認取消嗎}
    H[系統更新預約狀態]
    I{取消成功嗎}
    J[釋放原預約時段]
    K[顯示取消成功]
    L[顯示無法取消或操作失敗]
    M([結束])

    A --> B
    B --> C
    C --> D
    D --> E
    E -->|是| F
    E -->|否| L
    F --> G
    G -->|是| H
    G -->|否| M
    H --> I
    I -->|是| J
    I -->|否| L
    J --> K
    K --> M
    L --> M
```

## 六、使用案例與 UML 圖表對照

| 使用案例 | 循序圖 | 活動圖 |
|---|---|---|
| UC-01 查詢場地 | 4.1 | 5.1 |
| UC-02 預約場地 | 4.2 | 5.2 |
| UC-03 取消預約 | 4.3 | 5.3 |

## 七、作業四總結

本次作業完成校園運動場地預約系統的 UML 系統設計。

包含一張 UML 類別圖、三張循序圖及三張活動流程圖，共七張圖表。

類別圖說明系統的主要類別與相互關係；
循序圖呈現使用者與系統之間的互動順序；
活動圖則說明各項功能的執行步驟及條件判斷。

透過本次系統設計，可以進一步了解校園運動場地預約系統的資料結構與功能流程，作為後續系統實作的設計依據。
